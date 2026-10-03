// 選んだ項目。laneId は行の国・地域、key は王朝なら "dynasty:<id>"、在位なら "reign:<人物の id>/<表示名>"
// （再登板の spec のまとまり。同じ行の、同じ人物・同じ表示名の在位）
export type Selection = { laneId: string; key: string };
