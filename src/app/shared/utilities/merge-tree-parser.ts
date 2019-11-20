import { ComputedAction, IMergeEntry, MergeResult } from '../model/merge.interface';
import { FileChangeStatus, LogFile } from '../state/DATA/logs-files';

interface IBlobSource {
  readonly type: string;
  readonly path: string;
  readonly sha: string;
  readonly mode: string;
}

function updateCurrentMergeEntry(
  entry: IMergeEntry | undefined,
  context: string,
  blobSource: IBlobSource
): IMergeEntry {
  const currentMergeEntry = entry || {
    context,
    diff: '',
  };

  const blob = {
    sha: blobSource.sha,
    mode: blobSource.mode,
    path: blobSource.path,
  };

  switch (blobSource.type) {
    case 'base':
      return {
        ...currentMergeEntry,
        base: blob,
      };
    case 'result':
      return {
        ...currentMergeEntry,
        result: blob,
      };
    case 'our':
      return {
        ...currentMergeEntry,
        our: blob,
      };
    case 'their':
      return {
        ...currentMergeEntry,
        their: blob,
      };
    default:
      return currentMergeEntry;
  }
}

/**
 * CREDIT to https://github.com/desktop/desktop/issues/4588
 * A fantastic way to check merge condition without changing working tree.
 */

// the merge-tree output is a collection of entries like this
//
// changed in both
//  base   100644 f69fbc5c40409a1db7a3f8353bfffe46a21d6054 atom/browser/resources/mac/Info.plist
//  our    100644 9094f0f7335edf833d51f688851e6a105de60433 atom/browser/resources/mac/Info.plist
//  their  100644 2dd8bc646cff3869557549a39477e30022e6cfdd atom/browser/resources/mac/Info.plist
// @@ -17,9 +17,15 @@
// <key>CFBundleIconFile</key>
// <string>electron.icns</string>
// <key>CFBundleVersion</key>
// +<<<<<<< .our
// <string>4.0.0</string>
// <key>CFBundleShortVersionString</key>
// <string>4.0.0</string>
// +=======
// +  <string>1.4.16</string>
// +  <key>CFBundleShortVersionString</key>
// +  <string>1.4.16</string>
// +>>>>>>> .their
// <key>LSApplicationCategoryType</key>
// <string>public.app-category.developer-tools</string>
// <key>LSMinimumSystemVersion</key>

// The first line for each entry is what I'm referring to as the the header
// This regex filters on the known entries that can appear
const contextHeaderRe = /^(merged|added in remote|removed in remote|changed in both|removed in local|added in both)$/;

// the rest of the header is made up of a number of entries formatted like this
//
//  base   100644 f69fbc5c40409a1db7a3f8353bfffe46a21d6054 atom/browser/resources/mac/Info.plist
//
// this regex let's us extract the blob details - the filename may also change
// as part of the merge if files are moved or renamed
const blobEntryRe = /^\s{2}(result|our|their|base)\s+(\d{6})\s([0-9a-f]{40})\s(.+)$/;

/**
 * Parse the Git output of a merge-tree command to identify whether it
 * has detected any conflicts between the branches to be merged
 *
 * @param text the stdout from a `git merge-tree` command
 *
 */
export function parseMergeResult(text: string): MergeResult {
  if (!text) {
    return {
      kind: ComputedAction.Clean,
      entries: null
    };
  }

  const entries = new Array<IMergeEntry>();

  const lines = text.split('\n');

  let mergeEntryHeader: string | undefined;
  let currentMergeEntry: IMergeEntry | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = contextHeaderRe.exec(line);
    if (headerMatch != null) {
      mergeEntryHeader = headerMatch[1];

      // push the previous entry, if defined, into the array
      if (currentMergeEntry != null) {
        entries.push(currentMergeEntry);
        currentMergeEntry = undefined;
      }

      continue;
    }

    // the next lines are a number of merge result entries
    // pointing to blobs representing the source blob
    // and the resulting blob generated by the merge
    const blobMatch = blobEntryRe.exec(line);
    if (blobMatch != null) {
      const type = blobMatch[1];
      const mode = blobMatch[2];
      const sha = blobMatch[3];
      const path = blobMatch[4];

      const blob = {
        type,
        mode,
        sha,
        path,
      };

      if (mergeEntryHeader == null) {
        console.warn(
          `An unknown header was set while trying to parse the blob on line ${ i }`
        );
        continue;
      }

      switch (type) {
        case 'base':
        case 'result':
        case 'our':
        case 'their':
          currentMergeEntry = updateCurrentMergeEntry(
            currentMergeEntry,
            mergeEntryHeader,
            blob
          );
          break;

        default:
          throw new Error(
            `invalid state - unexpected entry ${ type } found when parsing rows`
          );
      }
      continue;
    }

    if (currentMergeEntry == null) {
      throw new Error(
        `invalid state - trying to append the diff to a merge entry that isn't defined on line ${ i }`
      );
    } else {
      const currentDiff = currentMergeEntry.diff;
      const newDiff = currentDiff + line + '\n';
      currentMergeEntry = {
        ...currentMergeEntry,
        diff: newDiff,
      };

      const lineHasConflictMarker =
        line.startsWith('+<<<<<<<') ||
        line.startsWith('+=======') ||
        line.startsWith('+>>>>>>>');

      if (lineHasConflictMarker) {
        currentMergeEntry = {
          ...currentMergeEntry,
          hasConflicts: true,
        };
      }
    }
  }

  // ensure the last entry is pushed onto the array
  if (currentMergeEntry != null) {
    entries.push(currentMergeEntry);
    currentMergeEntry = undefined;
  }

  const entriesWithConflicts = entries.filter(e => e.hasConflicts || false);

  if (entriesWithConflicts.length > 0) {
    return {
      kind: ComputedAction.Conflicts,
      conflictedFiles: entriesWithConflicts.length,
    };
  } else {
    return { kind: ComputedAction.Clean, entries };
  }
}

export function parseDiffCheckResult(text: string) {
  if (!text || text.trim().length === 0) {
    return [];
  }
  const returnPathStatus: string[] = [];
  // create array based on \n
  const arrayFileCheck = text.split(/\n$/).filter(line => line.trim().length > 0);
  arrayFileCheck.forEach(rawLine => {
    /**
     * Info will be split into:
     * [ << file-name :row: >>, << message >>]
     */
    const splitInfo = rawLine.split(/\s(.+)/).filter(line => line.trim().length > 0);
    const filePathAndRow = splitInfo[0].split(/(:(\d)+:)$/);
    const filePath = filePathAndRow[0];
    const rowCheck = filePathAndRow[1];
    const info = splitInfo[1];

    // check if conflict
    if (info.match(/conflict\smarker/g)) {
      returnPathStatus.push(filePath);
    }
  });
  return returnPathStatus;
}

export function parseStatusSB(rawText: string) {
  if (!rawText || rawText.trim().length === 0) {
    return {
      branchName: null,
      trackTo: null
    };
  }
  // Tracking remote branch that has upstream will contain:
  // ## <<branch-name>>...<<remote>>/<<branch-name>> \n ...
  // local branch with no upstream will be:
  // ## <<branch-name>> \n
  const infoTrack = rawText.split(/\n/).filter(s => s.trim().length > 0)[0];
  const branchTrack = infoTrack.split(/\s/).filter(s => s.trim().length > 0)[1];
  if (branchTrack.includes('...')) {
    // might has the upstream
    const info = branchTrack.split('...').filter(s => s.trim().length > 0);
    return {
      branchName: info[0],
      trackTo: info[1]
    };
  } else {
    return {
      branchName: branchTrack.trim(),
      trackTo: null
    };
  }
}

export function parseShowFileHistory(rawText: string) {
  const fileLogs: LogFile[] = [];
  if (!rawText || rawText.trim().length === 0) {
    return fileLogs;
  }
  const splitRows = rawText.split('\n').filter(emp => emp.trim().length > 0);
  // first 4-5 rows is log information, so splice them away
  let arrayFileInfo = splitRows.slice(4);
  // check if the first row is body message
  if (arrayFileInfo[0].match(/^\s\s\s\s\w+/)) {
    arrayFileInfo = arrayFileInfo.slice(1);
  }
  arrayFileInfo.forEach(file => {
    fileLogs.push({
      path: file.slice(2),
      status: <FileChangeStatus>file.slice(0, 1)
    });
  });
  return fileLogs;
}
