import { getTalentStatKey } from "../../../Build/Build"
import { FormulaItem, IFormulaSheet } from "../../../Types/character"
import { IConditionalValue } from "../../../Types/IConditional"
import { BasicStats } from "../../../Types/stats"
import { toTalentPercent } from "../../../Util/DataminedUtil"
import { basicDMGFormula } from "../../../Util/FormulaUtil"
import skillParam_gen_pre from './skillParam_gen.json'
const skillParam_gen = skillParam_gen_pre as any
export const energyCosts = [40, 50, 60, 70, 80, 90] as const
export const resolveStacks = [10, 20, 30, 40, 50, 60] as const
export const data = {
  normal: {
    hitArr: [
      toTalentPercent(skillParam_gen.auto[0]),
      toTalentPercent(skillParam_gen.auto[1]),
      toTalentPercent(skillParam_gen.auto[2]),
      toTalentPercent(skillParam_gen.auto[3]),//x2
      toTalentPercent(skillParam_gen.auto[5]),
    ]
  },
  charged: {
    dmg: toTalentPercent(skillParam_gen.auto[6]),
    stam: skillParam_gen.auto[7][0]
  },
  plunging: {
    dmg: toTalentPercent(skillParam_gen.auto[8]),
    low: toTalentPercent(skillParam_gen.auto[9]),
    high: toTalentPercent(skillParam_gen.auto[10]),
  },
  skill: {
    skillDMG: toTalentPercent(skillParam_gen.skill[0]),
    coorDMG: toTalentPercent(skillParam_gen.skill[1]),
    eleBurConv: toTalentPercent(skillParam_gen.skill[3]),
  },
  burst: {
    dmg: toTalentPercent(skillParam_gen.burst[0]),
    resolve: toTalentPercent(skillParam_gen.burst[1]),
    resolve_: toTalentPercent(skillParam_gen.burst[2]),
    resGain: toTalentPercent(skillParam_gen.burst[3]),
    hit1: toTalentPercent(skillParam_gen.burst[4]),
    hit2: toTalentPercent(skillParam_gen.burst[5]),
    hit3: toTalentPercent(skillParam_gen.burst[6]),
    hit41: toTalentPercent(skillParam_gen.burst[7]),
    hit42: toTalentPercent(skillParam_gen.burst[8]),
    hit5: toTalentPercent(skillParam_gen.burst[9]),
    charged1: toTalentPercent(skillParam_gen.burst[10]),
    charged2: toTalentPercent(skillParam_gen.burst[11]),
    stam: skillParam_gen.burst[12][0],
    plunge: toTalentPercent(skillParam_gen.burst[13]),
    plungeLow: toTalentPercent(skillParam_gen.burst[14]),
    plungeHigh: toTalentPercent(skillParam_gen.burst[15]),
    enerGen: skillParam_gen.burst[16],
    duration: skillParam_gen.burst[17][0],
    cd: skillParam_gen.burst[18][0],
    enerCost: skillParam_gen.burst[19][0],
  }
} as const
const formula: IFormulaSheet = {
  normal: Object.fromEntries(data.normal.hitArr.map((arr, i) =>
    [i, stats => basicDMGFormula(arr[stats.tlvl.auto], stats, "normal")])),
  charged: Object.fromEntries(Object.entries(data.charged).map(([name, arr]) =>
    [name, stats => basicDMGFormula(arr[stats.tlvl.auto], stats, "charged")])),
  plunging: Object.fromEntries(Object.entries(data.plunging).map(([name, arr]) =>
    [name, stats => basicDMGFormula(arr[stats.tlvl.auto], stats, "plunging")])),
  skill: {
    skillDMG: stats => basicDMGFormula(data.skill.skillDMG[stats.tlvl.skill], stats, "skill"),
    coorDMG: stats => basicDMGFormula(data.skill.coorDMG[stats.tlvl.skill], stats, "skill"),
    eleBurConv: stats => {
      const val = data.skill.eleBurConv[stats.tlvl.skill]
      const stam = data.burst.stam
      return [s => val * stam, []]
    },
    ...Object.fromEntries(energyCosts.map(c => [c, stats => {
      const val = data.skill.eleBurConv[stats.tlvl.skill]
      return [s => val * c, []]
    }]))
  },
  burst: {
    dmg: stats => burstDMG(data.burst.dmg[stats.tlvl.burst], stats, true),
    hit1: stats => burstDMG(data.burst.hit1[stats.tlvl.burst], stats),
    hit2: stats => burstDMG(data.burst.hit2[stats.tlvl.burst], stats),
    hit3: stats => burstDMG(data.burst.hit3[stats.tlvl.burst], stats),
    hit41: stats => burstDMG(data.burst.hit41[stats.tlvl.burst], stats),
    hit42: stats => burstDMG(data.burst.hit42[stats.tlvl.burst], stats),
    hit5: stats => burstDMG(data.burst.hit5[stats.tlvl.burst], stats),
    charged1: stats => burstDMG(data.burst.charged1[stats.tlvl.burst], stats),
    charged2: stats => burstDMG(data.burst.charged2[stats.tlvl.burst], stats),
    plunge: stats => burstDMG(data.burst.plunge[stats.tlvl.burst], stats),
    plungeLow: stats => burstDMG(data.burst.plungeLow[stats.tlvl.burst], stats),
    plungeHigh: stats => burstDMG(data.burst.plungeHigh[stats.tlvl.burst], stats),
  },
  a4: {
    eleDMG: stats => {
      return [s => (s.enerRech_ - 100) * 0.4, ["enerRech_"]]
    }
  }
} as const

function burstDMG(percent: number, stats: BasicStats, intial = false): FormulaItem {
  let resolveStack = 0
  const value = stats.conditionalValues?.character?.raidenshogun?.sheet?.talent?.res as IConditionalValue | undefined
  if (value) {
    const [num, condEleKey] = value
    if (num && condEleKey) resolveStack = parseInt(condEleKey)
  }
  const resolve = resolveStack ? ((intial ? data.burst.resolve[stats.tlvl.burst] : data.burst.resolve_[stats.tlvl.burst]) * resolveStack) / 100 : 0
  const multi = percent / 100 + resolve

  if (stats.constellation < 2) {
    const statKey = getTalentStatKey("burst", stats)
    return [s => multi * s[statKey], [statKey]]
  }
  const enemyLevelMulti = (100 + stats.characterLevel) / ((100 + stats.characterLevel) + (100 + stats.enemyLevel) * (1 - Math.min(stats.enemyDEFRed_ + 60, 90) / 100))
  const hitModeMultiKey = stats.hitMode === "avgHit" ? "burst_avgHit_base_multi" : stats.hitMode === "critHit" ? "critHit_base_multi" : ""
  return [s => multi * s.finalATK * (hitModeMultiKey ? s[hitModeMultiKey] : 1) * s.electro_burst_hit_base_multi * enemyLevelMulti * s.electro_enemyRes_multi, ["finalATK", ...(hitModeMultiKey ? [hitModeMultiKey] : []), "electro_burst_hit_base_multi", "electro_enemyRes_multi"]]
}
export default formula