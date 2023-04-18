import { Value, PutBucket, DelEntry, DelBucket } from '@urbit/api';
import _ from 'lodash';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lsDesk } from '@/constants';
import { HeapDisplayMode, HeapSortMode } from '@/types/heap';
import useReactQuerySubscription from '@/logic/useReactQuerySubscription';
import api from '../api';

interface ChannelSetting {
  flag: string;
}

export interface HeapSetting extends ChannelSetting {
  sortMode: HeapSortMode;
  displayMode: HeapDisplayMode;
}

export interface DiarySetting extends ChannelSetting {
  sortMode: 'time-dsc' | 'quip-dsc' | 'time-asc' | 'quip-asc';
  commentSortMode: 'asc' | 'dsc';
}

interface GroupSideBarSort {
  [flag: string]: typeof ALPHABETICAL | typeof RECENT | typeof DEFAULT;
}

interface PutEntry {
  // this is defined here because the PutEntry type in @urbit/api is missing the desk field
  'put-entry': {
    'bucket-key': string;
    'entry-key': string;
    value: Value;
    desk: string;
  };
}

interface SettingsEvent {
  'settings-event': PutEntry | PutBucket | DelEntry | DelBucket;
}

const ALPHABETICAL = 'A → Z';
const DEFAULT = 'Arranged';
const RECENT = 'Recent';

export type SidebarFilter =
  | 'Direct Messages'
  | 'All Messages'
  | 'Group Channels';

export const filters: Record<string, SidebarFilter> = {
  dms: 'Direct Messages',
  all: 'All Messages',
  groups: 'Group Channels',
};

export interface SettingsState {
  display: {
    theme: 'light' | 'dark' | 'auto';
  };
  calmEngine: {
    disableAppTileUnreads: boolean;
    disableAvatars: boolean;
    disableRemoteContent: boolean;
    disableSpellcheck: boolean;
    disableNicknames: boolean;
    disableWayfinding: boolean;
  };
  tiles: {
    order: string[];
  };
  heaps: {
    heapSettings: Stringified<HeapSetting[]>;
  };
  diary: {
    settings: Stringified<DiarySetting[]>;
  };
  talk: {
    messagesFilter: SidebarFilter;
    showVitaMessage: boolean;
  };
  groups: {
    orderedGroupPins: string[];
    sideBarSort: typeof ALPHABETICAL | typeof DEFAULT | typeof RECENT;
    groupSideBarSort: Stringified<GroupSideBarSort>;
    showVitaMessage: boolean;
  };
  loaded: boolean;
  putEntry: (bucket: string, key: string, value: Value) => Promise<void>;
  fetchAll: () => Promise<void>;
  [ref: string]: unknown;
}

export const useSettings = () => {
  const { data, isLoading } = useReactQuerySubscription({
    initialScryPath: `/desk/${window.desk}`,
    scryApp: 'settings-store',
    app: 'settings-store',
    path: `/desk/${window.desk}`,
    queryKey: ['settings', window.desk],
  });

  if (!data) {
    return { data: {} as SettingsState, isLoading };
  }

  const { desk } = data as { desk: SettingsState };

  return { data: desk, isLoading };
};

export const useLandscapeSettings = () => {
  const { data, isLoading } = useReactQuerySubscription({
    initialScryPath: `/desk/${lsDesk}`,
    scryApp: 'settings-store',
    app: 'settings-store',
    path: `/desk/${lsDesk}`,
    queryKey: ['settings', lsDesk],
  });

  const { desk } = data as { desk: SettingsState };

  return { data: desk, isLoading };
};
export const useMergedSettings = () => {
  const { data: settings, isLoading: isSettingsLoading } = useSettings();
  const { data: lsSettings, isLoading: isLandscapeSettingsLoading } =
    useLandscapeSettings();

  return {
    data: {
      ..._.mergeWith(
        settings as Record<string, unknown>,
        lsSettings as Record<string, unknown>,
        (obj, src) => (_.isArray(src) ? src : undefined)
      ),
    } as { desk: SettingsState },
    isLoading: isSettingsLoading || isLandscapeSettingsLoading,
  };
};

export function useTheme() {
  const { data, isLoading } = useSettings();

  if (isLoading || data === undefined || data.display === undefined) {
    return 'auto';
  }

  const { display } = data;

  return display.theme;
}

export function useCalm() {
  const { data, isLoading } = useSettings();

  if (isLoading || !data || !data.calmEngine) {
    return {
      disableAppTileUnreads: false,
      disableAvatars: false,
      disableRemoteContent: false,
      disableSpellcheck: false,
      disableNicknames: false,
      disableWayfinding: false,
    } as SettingsState['calmEngine'];
  }

  const { calmEngine } = data;

  return calmEngine as SettingsState['calmEngine'];
}

export function useCalmSetting(key: keyof SettingsState['calmEngine']) {
  const data = useCalm();

  return data[key];
}

export function usePutEntryMutation({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  const queryClient = useQueryClient();
  const mutationFn = async (variables: { val: Value }) => {
    const { val } = variables;
    await api.trackedPoke<PutEntry, SettingsEvent>(
      {
        app: 'settings-store',
        mark: 'settings-event',
        json: {
          'put-entry': {
            desk: window.desk,
            'bucket-key': bucket,
            'entry-key': key,
            value: val,
          },
        },
      },
      {
        app: 'settings-store',
        path: `/desk/${window.desk}`,
      },
      (event) => {
        // default validator was not working
        const { 'settings-event': data } = event;

        if (data && 'put-entry' in data) {
          const { 'put-entry': entry } = data;
          if (entry) {
            const { 'bucket-key': bk, 'entry-key': ek, value: v } = entry;

            if (bk === bucket && ek === key) {
              return v === val;
            }

            return false;
          }
          return false;
        }
        return false;
      }
    );
  };

  return useMutation(['put-entry', bucket, key], mutationFn, {
    onMutate: () => {
      queryClient.invalidateQueries(['settings', window.desk]);
    },
  });
}

export function useCalmSettingMutation(key: keyof SettingsState['calmEngine']) {
  const { mutate, status } = usePutEntryMutation({
    bucket: 'calmEngine',
    key,
  });

  return {
    mutate: (val: boolean) => mutate({ val }),
    status,
  };
}

export function parseSettings<T>(settings: Stringified<T[]>): T[] {
  return settings !== '' ? JSON.parse(settings) : [];
}

export function getChannelSetting<T extends ChannelSetting>(
  settings: T[],
  flag: string
): T | undefined {
  return settings.find((el) => el.flag === flag);
}

export function setChannelSetting<T extends ChannelSetting>(
  settings: T[],
  newSetting: Partial<T>,
  flag: string
): T[] {
  const oldSettings = settings.slice(0);
  const oldSettingIndex = oldSettings.findIndex((s) => s.flag === flag);
  const setting = {
    ...oldSettings[oldSettingIndex],
    flag,
    ...newSetting,
  };

  if (oldSettingIndex >= 0) {
    oldSettings.splice(oldSettingIndex, 1);
  }

  return [...oldSettings, setting];
}

export function useHeapSettings(): HeapSetting[] {
  const { data, isLoading } = useSettings();

  if (isLoading || data === undefined || data.heaps === undefined) {
    return [];
  }

  const { heaps } = data;

  return parseSettings(heaps.heapSettings) as HeapSetting[];
}

export function useHeapSortMode(flag: string): HeapSortMode {
  const settings = useHeapSettings();
  const heapSetting = getChannelSetting(settings, flag);
  return heapSetting?.sortMode ?? 'time';
}

export function useHeapDisplayMode(flag: string): HeapDisplayMode {
  const settings = useHeapSettings();
  const heapSetting = getChannelSetting(settings, flag);
  return heapSetting?.displayMode ?? 'grid';
}

export function useDiarySettings(): DiarySetting[] {
  const { data, isLoading } = useSettings();

  if (isLoading || data === undefined || data.diary === undefined) {
    return [];
  }

  const { diary } = data;

  return parseSettings(diary.settings) as DiarySetting[];
}

export function useDiarySortMode(
  flag: string
): 'time-dsc' | 'quip-dsc' | 'time-asc' | 'quip-asc' {
  const settings = useDiarySettings();
  const heapSetting = getChannelSetting(settings, flag);
  return heapSetting?.sortMode ?? 'time-dsc';
}

export function useDiaryCommentSortMode(flag: string): 'asc' | 'dsc' {
  const settings = useDiarySettings();
  const setting = getChannelSetting(settings, flag);
  return setting?.commentSortMode ?? 'asc';
}

export function useGroupSideBarSort() {
  const { data, isLoading } = useSettings();

  if (isLoading || data === undefined || data.groups === undefined) {
    return { '~': 'A → Z' };
  }

  const { groups } = data;

  return JSON.parse(groups.groupSideBarSort ?? '{"~": "A → Z"}');
}

export function useSideBarSortMode() {
  const { data, isLoading } = useSettings();

  if (isLoading || data === undefined || data.groups === undefined) {
    return DEFAULT;
  }

  const { groups } = data;

  return groups.sideBarSort ?? DEFAULT;
}

export function useShowVitaMessage() {
  const { data, isLoading } = useSettings();

  if (isLoading || data === undefined) {
    return false;
  }

  const setting = data[window.desk as 'groups' | 'talk']?.showVitaMessage;
  return setting;
}

export function useMessagesFilter() {
  const { data, isLoading } = useSettings();

  if (isLoading || data === undefined || data.talk === undefined) {
    return filters.dms;
  }

  const { talk } = data;

  return talk.messagesFilter ?? filters.dms;
}

export function useTiles() {
  const { data, isLoading } = useSettings();

  return {
    order: data?.tiles?.order ?? [],
    loaded: !isLoading,
  };
}
