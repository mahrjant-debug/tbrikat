import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import {
  subscribeAllCongrats,
  subscribeApproved,
  subscribeAsset,
  subscribeBannedWords,
  subscribePartners,
  subscribePhotos,
  subscribeSettings,
} from '../lib/db';
import { compileWordList, type CompiledWordList } from '../lib/arabic';
import { hasCelebrated } from '../lib/celebrated';
import { RECENT_APPROVAL_MS } from '../lib/constants';
import type { BannedWord, Congrat, Partner, Photo, Settings } from '../lib/types';

/** كل الاشتراكات هنا بقائمة اعتماديات فارغة: لا إعادة اشتراك بسبب تغيّر حالة الواجهة. */

export function useSettings(): { settings: Settings; loaded: boolean; exists: boolean } {
  const [state, setState] = useState({ settings: DEFAULT_SETTINGS, loaded: false, exists: false });
  useEffect(() => subscribeSettings((settings, exists) => setState({ settings, loaded: true, exists })), []);
  return state;
}

export function useAsset(name: 'logo' | 'background'): string {
  const [url, setUrl] = useState('');
  useEffect(() => subscribeAsset(name, setUrl), [name]);
  return url;
}

export function useBannedWords(): { words: BannedWord[]; compiled: CompiledWordList; loaded: boolean } {
  const [state, setState] = useState<{ words: BannedWord[]; compiled: CompiledWordList; loaded: boolean }>({
    words: [],
    compiled: { phrases: [] },
    loaded: false,
  });
  useEffect(
    () =>
      subscribeBannedWords((words) =>
        setState({ words, compiled: compileWordList(words.map((w) => w.word)), loaded: true }),
      ),
    [],
  );
  return state;
}

export function usePhotos(): Photo[] {
  const [list, setList] = useState<Photo[]>([]);
  useEffect(() => subscribePhotos(setList), []);
  return list;
}

export function usePartners(): Partner[] {
  const [list, setList] = useState<Partner[]>([]);
  useEffect(() => subscribePartners(setList), []);
  return list;
}

export function sortApproved(list: Congrat[]): Congrat[] {
  return [...list].sort((a, b) => (a.approvedAt ?? a.createdAt) - (b.approvedAt ?? b.createdAt));
}

/**
 * التهاني المعتمدة لشاشة العرض. تُبلَّغ `onNewlyApproved` فقط بما اعتُمد حديثاً (خلال 3 دقائق)
 * ولم يُحتفل به من قبل؛ تعديل تهنئة معتمدة لا يغيّر عضويتها في الاستعلام فلا يُطلق احتفالاً.
 */
export function useApprovedCongrats(onNewlyApproved: (cards: Congrat[]) => void): {
  cards: Congrat[];
  loaded: boolean;
} {
  const [state, setState] = useState<{ cards: Congrat[]; loaded: boolean }>({ cards: [], loaded: false });
  const cbRef = useRef(onNewlyApproved);
  useEffect(() => {
    cbRef.current = onNewlyApproved;
  });
  useEffect(() => {
    let known: Set<string> | null = null;
    return subscribeApproved((list) => {
      setState({ cards: sortApproved(list), loaded: true });
      const fresh = known ? list.filter((c) => !known!.has(c.id)) : list;
      known = new Set(list.map((c) => c.id));
      const now = Date.now();
      const recent = fresh.filter(
        (c) => now - (c.approvedAt ?? c.createdAt) < RECENT_APPROVAL_MS && !hasCelebrated(c.id),
      );
      if (recent.length) cbRef.current(sortApproved(recent));
    });
  }, []);
  return state;
}

export function useAllCongrats(onArrived: (cards: Congrat[]) => void): { list: Congrat[]; loaded: boolean } {
  const [state, setState] = useState<{ list: Congrat[]; loaded: boolean }>({ list: [], loaded: false });
  const cbRef = useRef(onArrived);
  useEffect(() => {
    cbRef.current = onArrived;
  });
  useEffect(() => {
    // خط الأساس = أول لقطة قادمة من الخادم؛ ما قبلها (الكاش القديم) لا يُنبَّه عنه
    let baseline = false;
    return subscribeAllCongrats((list, meta) => {
      setState({ list, loaded: true });
      if (!baseline) {
        if (!meta.fromCache) baseline = true;
        return;
      }
      const fresh = meta.added.filter((c) => c.status === 'pending');
      if (fresh.length) cbRef.current(fresh);
    });
  }, []);
  return state;
}
