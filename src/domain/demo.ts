import { parseDeck } from './parser';
export const demoList = `Pokémon: 18
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Pidgey MEW 16
2 Pidgeot ex OBF 164
1 Rotom V LOR 58
1 Lumineon V BRS 40
1 Fezandipiti ex SFA 38

Trainer: 34
4 Arven OBF 186
3 Iono PAL 185
2 Boss's Orders PAL 172
4 Ultra Ball SVI 196
4 Buddy-Buddy Poffin TEF 144
4 Rare Candy SVI 191
2 Counter Catcher PAR 160
2 Super Rod PAL 188
1 Prime Catcher TEF 157
1 Forest Seal Stone SIT 156
1 Rescue Board TEF 159
2 Nest Ball SVI 181
2 Artazon PAL 171
2 Earthen Vessel PAR 163

Energy: 8
4 Fire Energy SVE 2
4 Psychic Energy SVE 5

Total Cards: 60`;
export const demoDeck = parseDeck(demoList, 'Dragapult ex / Pidgeot').deck!;
