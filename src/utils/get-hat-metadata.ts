export enum HatMaskType {
  Standard = 0,
  FaceMask = 1,
  HideHair = 2,
}

export function getHatMetadata(): Map<number, HatMaskType> {
  return new Map([
    [7, HatMaskType.FaceMask], // bandana
    [8, HatMaskType.FaceMask], // bandana
    [9, HatMaskType.FaceMask], // bandana
    [10, HatMaskType.FaceMask], // bandana
    [11, HatMaskType.FaceMask], // bandana
    [12, HatMaskType.FaceMask], // purple scarf
    [13, HatMaskType.FaceMask], // red scarf
    [14, HatMaskType.FaceMask], // black scarf
    [15, HatMaskType.FaceMask], // dragon mask
    [16, HatMaskType.HideHair], // black hood
    [17, HatMaskType.HideHair], // brown hood
    [18, HatMaskType.HideHair], // blue hood
    [19, HatMaskType.HideHair], // green hood
    [20, HatMaskType.HideHair], // red hood
    [21, HatMaskType.HideHair], // chainmail hat
    [25, HatMaskType.HideHair], // horned hat
    [26, HatMaskType.HideHair], // merchant hat
    [28, HatMaskType.HideHair], // helmy
    [30, HatMaskType.HideHair], // eloff helmet
    [31, HatMaskType.HideHair], // air hat
    [32, HatMaskType.FaceMask], // frog head
    [33, HatMaskType.FaceMask], // pilotte
    [34, HatMaskType.HideHair], // beruta
    [35, HatMaskType.HideHair], // pirate hat
    [36, HatMaskType.HideHair], // lotus helmet
    [37, HatMaskType.HideHair], // kitty hat
    [38, HatMaskType.HideHair], // hula hula hat
    [40, HatMaskType.HideHair], // gob helm
    [41, HatMaskType.HideHair], // horned gob helm
    [44, HatMaskType.HideHair], // helmet of darkness
    [46, HatMaskType.HideHair], // flad hat
    [47, HatMaskType.HideHair], // cook hat
    [48, HatMaskType.FaceMask], // glasses
    [50, HatMaskType.FaceMask], // medic cap
  ]);
}
