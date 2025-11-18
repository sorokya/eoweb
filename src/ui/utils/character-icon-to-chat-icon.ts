import { CharacterIcon } from 'eolib';
import { ChatIcon } from '../chat-icon';

export function characterIconToChatIcon(icon: CharacterIcon): ChatIcon {
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
