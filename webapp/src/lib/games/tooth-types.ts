export type Dentition = "permanent" | "primary";

export type ToothArch = "maxillary" | "mandibular";

export type ToothSide = "right" | "left";

export type ToothQuadrant =
  | "maxillary-right"
  | "maxillary-left"
  | "mandibular-left"
  | "mandibular-right";

export type ToothType = "incisor" | "canine" | "premolar" | "molar";

export type ToothVariant =
  | "central"
  | "lateral"
  | "canine"
  | "first"
  | "second"
  | "third";

export type CrownOutline =
  | "diamond"
  | "elongated-rectangle"
  | "heart"
  | "hexagonal"
  | "oval"
  | "pentagonal"
  | "rectangle"
  | "rhomboid"
  | "rounded-rectangle"
  | "rounded-square"
  | "rounded-trapezoid"
  | "trapezoid";

export type PermanentToothCode =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20"
  | "21"
  | "22"
  | "23"
  | "24"
  | "25"
  | "26"
  | "27"
  | "28"
  | "29"
  | "30"
  | "31"
  | "32";

export type PrimaryToothCode =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T";

export type PermanentSupernumeraryCode =
  | "51"
  | "52"
  | "53"
  | "54"
  | "55"
  | "56"
  | "57"
  | "58"
  | "59"
  | "60"
  | "61"
  | "62"
  | "63"
  | "64"
  | "65"
  | "66"
  | "67"
  | "68"
  | "69"
  | "70"
  | "71"
  | "72"
  | "73"
  | "74"
  | "75"
  | "76"
  | "77"
  | "78"
  | "79"
  | "80"
  | "81"
  | "82";

export type PrimarySupernumeraryCode = `${PrimaryToothCode}S`;

export type ToothCode = PermanentToothCode | PrimaryToothCode;

export type SupernumeraryToothCode =
  | PermanentSupernumeraryCode
  | PrimarySupernumeraryCode;

export interface CuspAnatomy {
  typical: number;
  minimum: number;
  maximum: number;
}

export interface RootAnatomy {
  typical: number;
  note: string;
}

export interface ToothMorphologyTemplate {
  id: string;
  dentition: Dentition;
  arch: ToothArch;
  toothType: ToothType;
  variant: ToothVariant;
  displayName: string;
  crownOutline: CrownOutline;
  cusps: CuspAnatomy;
  roots: RootAnatomy;
  groovePattern: string;
  landmark: string;
  cssProfile: string;
}

interface BaseTooth {
  arch: ToothArch;
  side: ToothSide;
  quadrant: ToothQuadrant;
  positionFromMidline: number;
  name: string;
  aliases: string[];
  toothType: ToothType;
  templateId: string;
  mirrorX: boolean;
}

export interface PermanentTooth extends BaseTooth {
  code: PermanentToothCode;
  supernumeraryCode: PermanentSupernumeraryCode;
  dentition: "permanent";
}

export interface PrimaryTooth extends BaseTooth {
  code: PrimaryToothCode;
  supernumeraryCode: PrimarySupernumeraryCode;
  dentition: "primary";
}

export type Tooth = PermanentTooth | PrimaryTooth;

export interface ToothCatalog {
  schemaVersion: 1;
  notation: string;
  viewpoint: string;
  sequence: string;
  templateOrientation: "right";
  supernumeraryRule: Record<Dentition, string>;
  morphologyTemplates: ToothMorphologyTemplate[];
  teeth: Tooth[];
}

export function isPermanentTooth(tooth: Tooth): tooth is PermanentTooth {
  return tooth.dentition === "permanent";
}

export function isPrimaryTooth(tooth: Tooth): tooth is PrimaryTooth {
  return tooth.dentition === "primary";
}
