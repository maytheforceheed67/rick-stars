/**
 * Dog patrols (the second Jerry interlude). The Pilot's Suspicion mechanic, reused: dog troopers
 * stand guard in the calm streets and searchlights light up the lawns. Jerry sneaks past with Shift.
 * If the meter fills, the dogs catch him; if he makes it through, they catch him at the end
 * anyway (it's canon).
 */
import { createSuspicion } from '../../s01e01-pilot/mechanics/suspicion';
import { jerryCaught } from '../scenes';

export const dogPatrols = createSuspicion({
  id: 'dog-patrols',
  name: 'Dog Patrols',
  help: 'Sneak (Shift) past the dog patrols. Running or dashing near a dog, or crossing a searchlight, raises suspicion.',
  firstAppears: 'S01E02',
  canon: false,
  watchers: ['dog-trooper'],
  scannerArt: 'dog-searchlight',
  checkpointArt: 'dog-checkpoint',
  objective: 'Sneak past the dog patrols.',
  checkpointObjective: 'The last checkpoint. Easy, Jerry...',
  firstHint: "Hold Shift to sneak past the dogs. Don't run near them. Searchlights notice you too.",
  blownLabel: 'CAUGHT',
  onBlown: (api) => {
    api.here().actScene(jerryCaught(), () => api.here().endAct());
  },
});
