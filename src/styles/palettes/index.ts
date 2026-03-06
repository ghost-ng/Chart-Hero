import type { ColorPalette } from '../types';
import { diagramStyles } from '../diagramStyles';

import { ocean } from './ocean';
import { berry } from './berry';
import { forest } from './forest';
import { sunset } from './sunset';
import { grayscale } from './grayscale';
import { cyber } from './cyber';
import { pastelDream } from './pastelDream';
import { earthTone } from './earthTone';
import { military } from './military';
import { accessible } from './accessible';
import { cyberC2 } from './cyberC2';
import { midnightAurora } from './midnightAurora';
import { roseGold } from './roseGold';
import { nordicFrost } from './nordicFrost';
import { terracotta } from './terracotta';
import { lavenderFields } from './lavenderFields';
import { tropical } from './tropical';
import { candyPop } from './candyPop';
import { tokyoNight } from './tokyoNight';
import { coralReef } from './coralReef';
import { vintageSage } from './vintageSage';

export const colorPalettes: Record<string, ColorPalette> = {
  ocean,
  berry,
  forest,
  sunset,
  grayscale,
  cyber,
  pastelDream,
  earthTone,
  military,
  accessible,
  cyberC2,
  midnightAurora,
  roseGold,
  nordicFrost,
  terracotta,
  lavenderFields,
  tropical,
  candyPop,
  tokyoNight,
  coralReef,
  vintageSage,
};

export const defaultPaletteId = 'ocean';

/** Special palette ID for the dynamic "Style Palette" that derives colors from the active diagram style */
export const STYLE_PALETTE_ID = '__style__';

/** Resolve the active palette. When `paletteId` is the style palette, dynamically builds
 *  a palette from the active diagram style's accent colors. Falls back to ocean. */
export function resolveActivePalette(paletteId: string, activeStyleId: string | null): ColorPalette {
  if (paletteId === STYLE_PALETTE_ID && activeStyleId) {
    const style = diagramStyles[activeStyleId];
    if (style && style.accentColors.length > 0) {
      return {
        id: STYLE_PALETTE_ID,
        displayName: 'Style Palette',
        colors: style.accentColors.slice(0, 5),
      };
    }
  }
  return colorPalettes[paletteId] ?? colorPalettes[defaultPaletteId];
}

export {
  ocean,
  berry,
  forest,
  sunset,
  grayscale,
  cyber,
  pastelDream,
  earthTone,
  military,
  accessible,
  cyberC2,
  midnightAurora,
  roseGold,
  nordicFrost,
  terracotta,
  lavenderFields,
  tropical,
  candyPop,
  tokyoNight,
  coralReef,
  vintageSage,
};
