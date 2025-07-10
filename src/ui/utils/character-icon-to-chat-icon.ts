import { CharacterIcon } from 'eolib';
import { ChatIcon } from '../chat';

export function characterIconToChatIcon(icon: CharacterIcon): number {
  switch (icon) {
    case CharacterIcon.Player:
      return ChatIcon.Player;
    case CharacterIcon.Party:
      return ChatIcon.PlayerParty;
    case CharacterIcon.Gm:
      return ChatIcon.GM;
    case CharacterIcon.GmParty:
      return ChatIcon.GMParty;
    case CharacterIcon.Hgm:
      return ChatIcon.HGM;
    case CharacterIcon.HgmParty:
      return ChatIcon.HGMParty;
  }
}
