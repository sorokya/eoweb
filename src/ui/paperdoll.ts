import { CharacterDetails, CharacterIcon, EquipmentPaperdoll } from 'eolib';
import { type Client, EquipmentSlot } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { capitalize } from '../utils/capitalize';
import { getItemMeta } from '../utils/get-item-meta';
import { Base } from './base-ui';
import { ChatIcon } from './chat';

export class Paperdoll extends Base {
  protected container = document.getElementById('paperdoll');
  private client: Client;
  private cover = document.getElementById('cover');
  private bntOk = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="ok"]',
  );
  private imgBoots: HTMLDivElement = this.container.querySelector(
    '.item[data-id="boots"]',
  );
  private imgAccessory: HTMLDivElement = this.container.querySelector(
    '.item[data-id="accessory"]',
  );
  private imgGloves: HTMLDivElement = this.container.querySelector(
    '.item[data-id="gloves"]',
  );
  private imgBelt: HTMLDivElement = this.container.querySelector(
    '.item[data-id="belt"]',
  );
  private imgArmor: HTMLDivElement = this.container.querySelector(
    '.item[data-id="armor"]',
  );
  private imgNecklace: HTMLDivElement = this.container.querySelector(
    '.item[data-id="necklace"]',
  );
  private imgHat: HTMLImageElement = this.container.querySelector(
    '.item[data-id="hat"]',
  );
  private imgShield: HTMLDivElement = this.container.querySelector(
    '.item[data-id="shield"]',
  );
  private imgWeapon: HTMLDivElement = this.container.querySelector(
    '.item[data-id="weapon"]',
  );
  private imgRing1: HTMLDivElement = this.container.querySelector(
    '.item[data-id="ring-1"]',
  );
  private imgRing2: HTMLDivElement = this.container.querySelector(
    '.item[data-id="ring-2"]',
  );
  private imgArmlet1: HTMLDivElement = this.container.querySelector(
    '.item[data-id="armlet-1"]',
  );
  private imgArmlet2: HTMLDivElement = this.container.querySelector(
    '.item[data-id="armlet-2"]',
  );
  private imgBracer1: HTMLDivElement = this.container.querySelector(
    '.item[data-id="bracer-1"]',
  );
  private imgBracer2: HTMLDivElement = this.container.querySelector(
    '.item[data-id="bracer-2"]',
  );
  private spanName: HTMLSpanElement = this.container.querySelector(
    'span[data-id="name"]',
  );
  private spanHome: HTMLSpanElement = this.container.querySelector(
    'span[data-id="home"]',
  );
  private spanClass: HTMLSpanElement = this.container.querySelector(
    'span[data-id="class"]',
  );
  private spanPartner: HTMLSpanElement = this.container.querySelector(
    'span[data-id="partner"]',
  );
  private spanTitle: HTMLSpanElement = this.container.querySelector(
    'span[data-id="title"]',
  );
  private spanGuild: HTMLSpanElement = this.container.querySelector(
    'span[data-id="guild"]',
  );
  private spanRank: HTMLSpanElement = this.container.querySelector(
    'span[data-id="rank"]',
  );
  private divIcon: HTMLDivElement = this.container.querySelector('div.icon');

  private icon = CharacterIcon.Player;
  private details = new CharacterDetails();
  private equipment = new EquipmentPaperdoll();

  constructor(client: Client) {
    super();
    this.client = client;
    this.bntOk.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.client.on('equipmentChanged', () => {
      if (this.details.playerId === client.playerId) {
        this.equipment.accessory = client.equipment.accessory;
        this.equipment.armlet = client.equipment.armlet;
        this.equipment.armor = client.equipment.armor;
        this.equipment.belt = client.equipment.belt;
        this.equipment.boots = client.equipment.boots;
        this.equipment.bracer = client.equipment.bracer;
        this.equipment.gloves = client.equipment.gloves;
        this.equipment.hat = client.equipment.hat;
        this.equipment.necklace = client.equipment.necklace;
        this.equipment.ring = client.equipment.ring;
        this.equipment.shield = client.equipment.shield;
        this.equipment.weapon = client.equipment.weapon;
        this.render();
      }
    });

    this.imgAccessory.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Accessory);
    });

    this.imgArmlet1.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Armlet1);
    });

    this.imgArmlet2.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Armlet2);
    });

    this.imgArmor.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Armor);
    });

    this.imgBelt.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Belt);
    });

    this.imgBoots.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Boots);
    });

    this.imgBracer1.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Bracer1);
    });

    this.imgBracer2.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Bracer2);
    });

    this.imgGloves.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Gloves);
    });

    this.imgHat.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Hat);
    });

    this.imgNecklace.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Necklace);
    });

    this.imgRing1.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Ring1);
    });

    this.imgRing2.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Ring2);
    });

    this.imgShield.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Shield);
    });

    this.imgWeapon.addEventListener('contextmenu', () => {
      this.client.unequipItem(EquipmentSlot.Weapon);
    });
  }

  setData(
    icon: CharacterIcon,
    details: CharacterDetails,
    equipment: EquipmentPaperdoll,
  ) {
    this.icon = icon;
    this.details = details;
    this.equipment = equipment;
  }

  private render() {
    this.container.setAttribute('data-gender', this.details.gender.toString());

    this.spanName.innerText = capitalize(this.details.name);
    this.spanHome.innerText = this.details.home;

    const classRecord = this.client.getEcfRecordById(this.details.classId);
    if (classRecord) {
      this.spanClass.innerText = classRecord.name;
    } else {
      this.spanClass.innerText = '';
    }

    this.spanPartner.innerText = capitalize(this.details.partner);
    this.spanTitle.innerText = this.details.title;
    this.spanGuild.innerText = this.details.guild;
    this.spanRank.innerText = this.details.guildRank;

    switch (this.icon) {
      case CharacterIcon.Player:
        this.divIcon.setAttribute('data-id', ChatIcon.Player.toString());
        break;
      case CharacterIcon.Party:
        this.divIcon.setAttribute('data-id', ChatIcon.PlayerParty.toString());
        break;
      case CharacterIcon.Gm:
        this.divIcon.setAttribute('data-id', ChatIcon.GM.toString());
        break;
      case CharacterIcon.GmParty:
        this.divIcon.setAttribute('data-id', ChatIcon.GMParty.toString());
        break;
      case CharacterIcon.Hgm:
        this.divIcon.setAttribute('data-id', ChatIcon.HGM.toString());
        break;
      case CharacterIcon.HgmParty:
        this.divIcon.setAttribute('data-id', ChatIcon.HGMParty.toString());
        break;
    }

    this.setEquipment(EquipmentSlot.Boots, this.equipment.boots, this.imgBoots);
    this.setEquipment(
      EquipmentSlot.Accessory,
      this.equipment.accessory,
      this.imgAccessory,
    );
    this.setEquipment(
      EquipmentSlot.Gloves,
      this.equipment.gloves,
      this.imgGloves,
    );
    this.setEquipment(EquipmentSlot.Belt, this.equipment.belt, this.imgBelt);
    this.setEquipment(EquipmentSlot.Armor, this.equipment.armor, this.imgArmor);
    this.setEquipment(
      EquipmentSlot.Necklace,
      this.equipment.necklace,
      this.imgNecklace,
    );
    this.setEquipment(EquipmentSlot.Hat, this.equipment.hat, this.imgHat);
    this.setEquipment(
      EquipmentSlot.Shield,
      this.equipment.shield,
      this.imgShield,
    );
    this.setEquipment(
      EquipmentSlot.Weapon,
      this.equipment.weapon,
      this.imgWeapon,
    );
    this.setEquipment(
      EquipmentSlot.Ring1,
      this.equipment.ring[0],
      this.imgRing1,
    );
    this.setEquipment(
      EquipmentSlot.Ring2,
      this.equipment.ring[1],
      this.imgRing2,
    );
    this.setEquipment(
      EquipmentSlot.Armlet1,
      this.equipment.armlet[0],
      this.imgArmlet1,
    );
    this.setEquipment(
      EquipmentSlot.Armlet2,
      this.equipment.armlet[1],
      this.imgArmlet2,
    );
    this.setEquipment(
      EquipmentSlot.Bracer1,
      this.equipment.bracer[0],
      this.imgBracer1,
    );
    this.setEquipment(
      EquipmentSlot.Bracer2,
      this.equipment.bracer[1],
      this.imgBracer2,
    );
  }

  private setEquipment(
    slot: EquipmentSlot,
    itemId: number,
    el: HTMLDivElement,
  ) {
    const img = el.querySelector<HTMLImageElement>('img');
    const tooltip = el.querySelector<HTMLDivElement>('.tooltip');

    img.src = '';
    tooltip.innerText = '';
    tooltip.classList.add('hidden');

    if (!itemId) {
      return;
    }

    const record = this.client.getEifRecordById(itemId);
    if (!record) {
      return;
    }

    const meta = getItemMeta(record);
    img.src = `/gfx/gfx023/${100 + record.graphicId * 2}.png`;
    tooltip.innerText = `${record.name}\n${meta.join('\n')}`;
    tooltip.classList.remove('hidden');

    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', (e) => {
      playSfxById(SfxId.InventoryPickup);
      e.dataTransfer?.setData(
        'text/plain',
        JSON.stringify({ source: 'paperdoll', slot }),
      );
    });
  }

  show() {
    this.render();
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;

    const inventory = document.querySelector<HTMLDivElement>('#inventory');
    const dollRect = this.container.getBoundingClientRect();
    const inventoryRect = inventory.getBoundingClientRect();
    if (dollRect.bottom > inventoryRect.top) {
      this.container.style.top = `${Math.floor(inventoryRect.top - dollRect.height - 30)}px`;
    }
  }

  hide() {
    this.container.classList.add('hidden');
    this.cover.classList.add('hidden');
  }
}
