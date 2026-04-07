/**
 * VersionHistory — Auto-save snapshots with browseable restore list.
 *
 * Stores up to 20 snapshots of promotion state in localStorage.
 * Users can manually save named snapshots or restore from any point.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  History,
  Save,
  RotateCcw,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePromotionStore } from '@/stores/promotion-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ===== Types =====

interface Snapshot {
  id: string;
  name: string;
  timestamp: string;
  auto: boolean;
  /** Serialized promotion state JSON */
  data: string;
  /** Quick summary of what was in the state */
  summary: string;
}

// ===== Constants =====

export const SNAPSHOTS_KEY = 'promotionVersionHistory';
export const MAX_SNAPSHOTS = 20;
export const STORAGE_KEY = 'promotionBuilderState';

// ===== Helpers =====

export function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function persistSnapshots(snapshots: Snapshot[]) {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function buildSummary(data: string): string {
  try {
    const state = JSON.parse(data);
    const parts: string[] = [];
    if (state.promoDateRange) parts.push(state.promoDateRange);
    if (state.promoTitle) parts.push(state.promoTitle);
    const entryCount = state.promotionEntries?.length ?? 0;
    if (entryCount > 0) parts.push(`${entryCount} entries`);
    const hasNewsletter =
      state.newsletterBody &&
      state.newsletterBody.trim() !== '' &&
      state.newsletterBody.trim() !== '<p></p>';
    if (hasNewsletter) parts.push('newsletter');
    return parts.join(' · ') || 'Empty state';
  } catch {
    return 'Unknown state';
  }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ===== Component =====

export function VersionHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const store = usePromotionStore();
  const [snapshots, setSnapshots] = useState<Snapshot[]>(loadSnapshots);

  // Re-read from localStorage when auto-save happens externally
  useEffect(() => {
    if (refreshKey > 0) {
      setSnapshots(loadSnapshots());
    }
  }, [refreshKey]);
  const [saveName, setSaveName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  // Get current state JSON
  const getCurrentStateJSON = useCallback((): string => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw || '{}';
  }, []);

  // Save a snapshot
  const saveSnapshot = useCallback(
    (name: string, auto: boolean) => {
      const data = getCurrentStateJSON();
      const snapshot: Snapshot = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        timestamp: new Date().toISOString(),
        auto,
        data,
        summary: buildSummary(data),
      };

      setSnapshots((prev) => {
        const updated = [snapshot, ...prev].slice(0, MAX_SNAPSHOTS);
        persistSnapshots(updated);
        return updated;
      });
    },
    [getCurrentStateJSON]
  );

  // Manual save
  const handleManualSave = () => {
    const name = saveName.trim() || `Snapshot ${snapshots.length + 1}`;
    saveSnapshot(name, false);
    setSaveName('');
  };

  // Restore a snapshot
  const handleRestore = async (snapshot: Snapshot) => {
    try {
      localStorage.setItem(STORAGE_KEY, snapshot.data);
      await store.loadFromIndexedDB();
      setConfirmRestoreId(null);
    } catch (err) {
      console.warn('Restore failed:', err);
    }
  };

  // Delete a snapshot
  const handleDelete = (id: string) => {
    setSnapshots((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      persistSnapshots(updated);
      return updated;
    });
    if (expandedId === id) setExpandedId(null);
    if (confirmRestoreId === id) setConfirmRestoreId(null);
  };

  // Clear all auto-saves
  const handleClearAuto = () => {
    setSnapshots((prev) => {
      const updated = prev.filter((s) => !s.auto);
      persistSnapshots(updated);
      return updated;
    });
  };

  const autoCount = snapshots.filter((s) => s.auto).length;
  const manualCount = snapshots.filter((s) => !s.auto).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Save and restore promotion snapshots. Auto-saves every 5 minutes when
        content changes.
      </p>

      {/* Manual Save */}
      <div className="flex gap-1.5">
        <Input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Snapshot name (optional)..."
          className="h-7 text-xs flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleManualSave();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={handleManualSave}
        >
          <Save className="h-3 w-3" />
          Save
        </Button>
      </div>

      {/* Summary */}
      {snapshots.length > 0 && (
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {manualCount} saved · {autoCount} auto-saved
          </span>
          {autoCount > 0 && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-destructive ml-auto"
              onClick={handleClearAuto}
            >
              Clear auto-saves
            </button>
          )}
        </div>
      )}

      {/* Snapshot List */}
      {snapshots.length === 0 ? (
        <div className="text-center py-4">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">
            No snapshots yet. Save one or wait for auto-save.
          </p>
        </div>
      ) : (
        <div className="space-y-1" data-testid="version-history-list">
          {snapshots.map((snapshot) => {
            const isExpanded = expandedId === snapshot.id;
            const isConfirming = confirmRestoreId === snapshot.id;

            return (
              <div
                key={snapshot.id}
                className={cn(
                  'rounded-md border text-xs transition-colors',
                  snapshot.auto
                    ? 'border-dashed'
                    : 'border-solid',
                  isExpanded && 'bg-accent/30'
                )}
              >
                {/* Header row */}
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-left hover:bg-accent/20 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : snapshot.id)
                  }
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium truncate flex-1">
                    {snapshot.name}
                  </span>
                  {snapshot.auto && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      auto
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTimestamp(snapshot.timestamp)}
                  </span>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-2.5 pb-2 space-y-1.5">
                    <p className="text-muted-foreground">{snapshot.summary}</p>
                    <div className="flex gap-1.5">
                      {isConfirming ? (
                        <>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 self-center">
                            Restore this snapshot? Current state will be overwritten.
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => handleRestore(snapshot)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setConfirmRestoreId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 gap-1 text-[10px] px-2"
                            onClick={() => setConfirmRestoreId(snapshot.id)}
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(snapshot.id)}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
