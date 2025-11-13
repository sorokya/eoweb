import { SfxId } from '../sfx';

export class WeaponMetadata {
  constructor(
    public slash: number | null,
    public sfx: SfxId[],
    public ranged: boolean,
  ) {}
}

export function getWeaponMetaData(): Map<number, WeaponMetadata> {
  return new Map([
    [0, new WeaponMetadata(null, [SfxId.PunchAttack], false)], // fist
    [1, new WeaponMetadata(3, [SfxId.MeleeWeaponAttack], false)], // wood axe
    [2, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // sai
    [3, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // dragon blade
    [4, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // dagger
    [5, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // spear
    [6, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // saber
    [7, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // staff
    [8, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // book
    [9, new WeaponMetadata(3, [SfxId.MeleeWeaponAttack], false)], // mace
    [10, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // spirit star
    [11, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // throw axe
    [12, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // dark katana
    [13, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // short sword
    [14, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // broadsword
    [15, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // broom
    [16, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // ninchackus
    [17, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // ancient star
    [18, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // battle axe
    [19, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // ancient sword
    [20, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // luna staff
    [21, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // lance
    [22, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // aura staff
    [23, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // forest staff
    [24, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // normal sword
    [25, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // jewel staff
    [26, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // thor's hammer
    [27, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // light katana
    [28, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // polearm
    [29, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // sickle
    [30, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // trident
    [31, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // warlock sword
    [32, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // whip
    [33, new WeaponMetadata(5, [SfxId.MeleeWeaponAttack], false)], // ultima
    [34, new WeaponMetadata(5, [SfxId.MeleeWeaponAttack], false)], // ice blade
    [35, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // gold defender
    [36, new WeaponMetadata(4, [SfxId.MeleeWeaponAttack], false)], // lotus sword
    [37, new WeaponMetadata(4, [SfxId.MeleeWeaponAttack], false)], // cristal sword
    [38, new WeaponMetadata(5, [SfxId.MeleeWeaponAttack], false)], // killing edge
    [39, new WeaponMetadata(7, [SfxId.AlternateMeleeAttack], false)], // dark blade
    [40, new WeaponMetadata(7, [SfxId.AlternateMeleeAttack], false)], // reaper scyth
    [41, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // crescent staff
    [42, new WeaponMetadata(0, [SfxId.AttackBow], true)], // bow
    [43, new WeaponMetadata(0, [SfxId.AttackBow], true)], // xbow
    [44, new WeaponMetadata(8, [SfxId.AlternateMeleeAttack], false)], // reaper
    [45, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // hockey stick
    [46, new WeaponMetadata(5, [SfxId.MeleeWeaponAttack], false)], // twin blades
    [47, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // lefor mace
    [48, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // cava staff
    [49, new WeaponMetadata(0, [SfxId.Harp1, SfxId.Harp2, SfxId.Harp3], true)], // harp
    [
      50,
      new WeaponMetadata(
        0,
        [SfxId.Guitar1, SfxId.Guitar2, SfxId.Guitar3],
        true,
      ),
    ], // guitar
    [51, new WeaponMetadata(5, [SfxId.MeleeWeaponAttack], false)], // battle spear
    [52, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // flail
    [53, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // war axe
    [54, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // gastro
    [55, new WeaponMetadata(7, [SfxId.AlternateMeleeAttack], false)], // ablo staff
    [56, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // fluon sword
    [57, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // rapier
    [58, new WeaponMetadata(0, [SfxId.Gun], true)], // gun
    [59, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // knob staff
    [60, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // fladdat staff
    [61, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // gabrasto
    [62, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // battle spear 2
    [63, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // lens of truth
    [64, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // chopper
    [65, new WeaponMetadata(3, [SfxId.MeleeWeaponAttack], false)], // adger
    [66, new WeaponMetadata(1, [SfxId.MeleeWeaponAttack], false)], // chains
    [67, new WeaponMetadata(2, [SfxId.MeleeWeaponAttack], false)], // mitova
    [68, new WeaponMetadata(3, [SfxId.MeleeWeaponAttack], false)], // merhawk
    [69, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // kontra
    [70, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // jack spear
    [71, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // bazar staff
    [72, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // saw blade
    [73, new WeaponMetadata(0, [SfxId.AttackBow], true)], // scav bow
    [74, new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false)], // fan
  ]);
}
