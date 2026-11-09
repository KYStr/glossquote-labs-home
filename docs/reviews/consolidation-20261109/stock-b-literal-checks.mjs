const sum = list => list.reduce((a, b) => a + b, 0);
const ids = list => list.map(item => item.name);
const identity = value => value;
const parts = keys => value => keys.map(key => value[key]);
const roundTenth = (numerator, denominator) => {
  const scaled = BigInt(numerator) * 10n;
  const den = BigInt(denominator);
  return Number(scaled / den + (scaled % den * 2n >= den ? 1n : 0n));
};
function permutations(values) {
  return values.length === 0 ? [[]] : values.flatMap((value, i) =>
    permutations(values.filter((_, j) => i !== j)).map(rest => [value, ...rest]));
}

export const checks = [
  ['frame-row-marking.center', ({ spanMm, frames }) => {
    const gaps = frames.length + 1;
    const available = spanMm - sum(frames.map(f => f.wMm));
    const tallest = Math.max(...frames.map(f => f.hMm));
    return [roundTenth(available, gaps), frames.map((f, i) => {
      const priorWidth = sum(frames.slice(0, i).map(row => row.wMm));
      const x = (i + 1) * available + gaps * priorWidth;
      return [roundTenth(x, gaps), (tallest - f.hMm) * 5, roundTenth(x + gaps * f.hookLeftMm, gaps), (tallest - f.hMm) * 5 + 10 * f.hookTopMm];
    })];
  }, r => [r.gapTenths, r.marks.map(parts(['leftTenths', 'topTenths', 'hookXTenths', 'hookYTenths']))], '將 500 mm 餘量除 3，對絕對框邊及偏移的整數分數獨立取十分位。'],

  ['curtain-repeat-cut.matched', ({ stockMm, repeatMm, headPhaseMm, motifPhaseMm, panels }) => {
    let position = 0;
    const cuts = panels.map(p => {
      const startMm = Array.from({ length: repeatMm }, (_, i) => position + i).find(s => (s + p.topMm + headPhaseMm) % repeatMm === motifPhaseMm);
      const endMm = startMm + p.topMm + p.finishedMm + p.bottomMm;
      const cut = { name: p.name, skipMm: startMm - position, startMm, endMm };
      position = endMm;
      return cut;
    });
    return { cuts, neededMm: position, wasteMm: sum(cuts.map(x => x.skipMm)), spareMm: stockMm - position, shortageMm: 0 };
  }, identity, '逐毫米枚舉一個花距的首個合法落剪點，得到 190/2,110，結尾 3,730。'],

  ['cash-float-tray.tie', ({ targetMinor, denominations }) => {
    const rows = [...denominations].sort((a, b) => b.valueMinor - a.valueMinor);
    const vectors = rows.reduce((prefixes, row) => prefixes.flatMap(prefix =>
      Array.from({ length: row.count + 1 }, (_, i) => [...prefix, i])), [[]]);
    const values = vectors.map(vector => ({ vector, value: sum(vector.map((n, i) => n * rows[i].valueMinor)), count: sum(vector) })).filter(x => x.value <= targetMinor);
    values.sort((a, b) => {
      const firstDifference = b.vector.findIndex((n, i) => n !== a.vector[i]);
      return b.value - a.value || a.count - b.count || (firstDifference < 0 ? 0 : b.vector[firstDifference] - a.vector[firstDifference]);
    });
    return [values[0].value, values[0].vector];
  }, r => [r.keptMinor, r.rows.map(x => x.kept)], '窮舉小清單。5+3 與 4+4 都到 8、同為兩件，高面額決勝。'],

  ['table-seating.backtrack', ({ tables, parties }) => {
    const home = parties.find(p => p.stepFree);
    const first = tables.find(t => t.stepFree);
    const second = tables.find(t => t.name !== first.name);
    const remaining = parties.filter(p => p.name !== home.name);
    return [{ name: first.name, parties: [home.name], remaining: first.seats - home.size },
      { name: second.name, parties: ids(remaining), remaining: second.seats - sum(remaining.map(p => p.size)) }];
  }, r => r.tables, 'B 只能坐 T1，放 B 後 T1 剩 2，小於 A 的 3。A 與固定的 C 合計 4 正好填滿 T2。'],

  ['gift-exchange-match.directed', ({ names, blocked }) => {
    const match = permutations(names).find(receivers => receivers.every((to, i) => to !== names[i] && !blocked.some(b => b.from === names[i] && b.to === to)));
    return names.map((from, i) => ({ from, to: match[i] }));
  }, r => r.assignments, '窮舉 3! 個收禮排列，刪掉自送及 A→B，首個合法排列 C,A,B。'],

  ['parcel-billable-weight.two-services', ({ parcels, services }) => services.map(s => {
    const pieces = parcels.map(p => {
      const l = Math.max(...p.sidesMm);
      const perimeter = 2 * sum(p.sidesMm) - l;
      const volumeMm3 = p.sidesMm.reduce((a, b) => a * b, 1);
      const volumeG = volumeMm3 / 1000 / s.divisor * 1000;
      return s.maxLengthMm !== null && l > s.maxLengthMm ? [perimeter, null] : [perimeter, Math.ceil(Math.max(p.actualG, s.minG, volumeG) / s.stepG) * s.stepG];
    });
    return [s.name, pieces.some(p => p[1] === null) ? null : sum(pieces.map(p => p[1])), pieces];
  }), r => r.services.map(s => [s.name, s.totalChargeG, s.pieces.map(parts(['wrapMm', 'chargeG']))]), '按 cm³、kg、g 分步換算，再對每件進位。服務 A 共 2,500g，B 的 P 超長，總計 null。'],

  ['knit-gauge-planner.tie-up', i => {
    const widthNeeded = i.targetWidthMm * i.swatchStitches / i.swatchWidthMm;
    const rowsNeeded = i.targetHeightMm * i.swatchRows / i.swatchHeightMm;
    const nearest = (desired, offset, repeat) => {
      const lower = Math.floor((desired - offset) / repeat) * repeat + offset;
      const upper = lower + repeat;
      return [lower, upper, desired - lower < upper - desired ? lower : upper];
    };
    return [nearest(widthNeeded, 2 * i.edgeEach, i.repeatStitches), nearest(rowsNeeded, 0, i.repeatRows)];
  }, r => [r.stitches, r.rows].map(axis => [axis.lower.count, axis.upper.count, axis.chosen.count]), '95mm 對應 19 針，在 16 和 22 正中。50mm 對應 10 行，在 8 和 12 正中。兩者取高。'],

  ['laundry-machine-handoff.delayed-wash', i => {
    const free = (lo, hi, list) => list.every(b => lo >= b.end || hi <= b.start);
    let washAvailable = i.start, dryAvailable = i.start;
    const rows = [];
    for (const l of i.loads) {
      let found = null;
      for (let w = washAvailable; w + l.washMin + l.dryMin <= i.end && !found; w++) {
        const end = w + l.washMin;
        if (!free(w, end, i.washerBusy)) continue;
        for (let d = Math.max(end, dryAvailable); d + l.dryMin <= i.end && d - end <= l.maxWaitMin; d++) {
          if (free(d, d + l.dryMin, i.dryerBusy)) { found = { name: l.name, washStart: w, washEnd: end, dryStart: d, dryEnd: d + l.dryMin, waitMin: d - end }; break; }
        }
      }
      if (!found) return { rows, blockedAt: l.name };
      rows.push(found); washAvailable = found.washEnd; dryAvailable = found.dryEnd;
    }
    return { rows, blockedAt: null };
  }, identity, '窮舉每個 (洗起、烘起) 整分鐘，而非倒掃前綴。A 可在 510/550，B 需到 570/590。'],

  ['plant-watering-route.farthest', ({ capacityMl, plants }) => {
    const taps = plants.flatMap((p, i) => p.tapBefore && i > 0 ? [i] : []);
    const candidates = taps.reduce((a, i) => [...a, ...a.map(b => [...b, i])], [[]]);
    const feasible = candidates.flatMap(stops => {
      let remaining = capacityMl;
      const walk = [], refills = [];
      for (const [i, plant] of plants.entries()) {
        if (stops.includes(i)) { refills.push({ before: plant.name, addMl: capacityMl - remaining }); remaining = capacityMl; }
        remaining -= plant.amountMl;
        if (remaining < 0) return [];
        walk.push({ name: plant.name, leftMl: remaining });
      }
      return [{ plants: walk, refills, blockedAt: null, missingMl: 0 }];
    });
    return feasible.sort((a, b) => a.refills.length - b.refills.length)[0];
  }, identity, '窮舉此例四種補水集合。僅在 C 補一次的路線成功，補量 650mL。'],

  ['loan-kit-turnover.turnover-overlap', ({ kits, loans }) => {
    const k = kits[0], [a, b] = loans;
    return [a.qty + b.qty, a.qty + b.qty - k.count, b.start, a.end + k.turnMin, [a.name, b.name]];
  }, r => [r.kits[0].peak, r.kits[0].minExtra, r.kits[0].shortages[0].from, r.kits[0].shortages[0].to, r.kits[0].shortages[0].loans], 'A 到 40 才可重用，B 在 30 開始。30–40 需求 5，短 1。'],

  ['film-roll-budget.priority-rounds', ({ remaining, reserve, scenes }) => {
    const available = remaining - reserve;
    const extras = available - sum(scenes.map(s => s.min));
    return [available, scenes[0].min + Math.ceil(extras / 2), scenes[1].min + Math.floor(extras / 2), scenes[2].min];
  }, r => [r.available, ...r.rows.map(x => x.planned)], '可用 20，最低配額 9，剩 11。高優先兩列分 6 和 5，低優先保持 4。'],

  ['bicycle-gear-table.half-up', ({ wheelMm, cadence, front, rear }) => {
    const n = wheelMm * front[0], d = rear[0];
    return [roundTenth(n, d), roundTenth(n * cadence * 60, d * 1000000)];
  }, r => [r.groups[0].rollTenthsMm, r.groups[0].speedTenthsKmh], '1,250 mm × 10 rpm × 60 ÷ 1,000,000 = 0.75 km/h，half-up 到 0.8。'],

  ['event-ticket-ranges.mixed', ({ issued, bundles }) => {
    const min = Number(issued.first), max = Number(issued.last);
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    const rows = numbers.map(n => bundles.filter(b => Number(b.first) <= n && n <= Number(b.last)).length);
    const outside = sum(bundles.map(b => Array.from({ length: Number(b.last) - Number(b.first) + 1 }, (_, i) => Number(b.first) + i).filter(n => n < min || n > max).length));
    return [rows.filter(n => n > 0).length, rows.filter(n => n === 0).length, sum(rows.map(n => Math.max(0, n - 1))), outside, numbers.filter((_, i) => rows[i] === 0)];
  }, r => [r.uniqueCovered, r.missingCount, r.duplicateCopies, r.outsideCopies, r.missing.map(m => Number(m.first))], '獨立展開 1–10，唯一缺 7、4 重一張、11 在外。固定寬度補零另依 fixture。'],

  ['court-queue-rotation.cap', ({ initialQueue, maxConsecutive, events }) => {
    const [a, b, c, d] = initialQueue;
    const wins = events.filter(e => e.type === 'finish' && e.winner === a).length;
    return [wins, maxConsecutive === wins ? [d, b, a, c] : null, [d, b]];
  }, r => [r.played, r.queue, r.next], 'A 擊敗 B 留場，排隊 C,D,B。再擊敗 C 達兩連場，依上場序 A,C 加回，D,B 下一場。'],

  ['game-night-scorecard.high-tiebreak', ({ players, rounds }) => {
    const rows = players.map((name, i) => {
      const scores = rounds.map(r => r.scores[i]);
      const bad = Math.min(...scores);
      return { name, total: sum(scores) - bad, best: Math.max(...scores), dropped: [rounds[scores.indexOf(bad)].name] };
    });
    rows.sort((a, b) => b.total - a.total || b.best - a.best);
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, r => r.standings, 'A、B 都保留 16 分，A 最佳 10 大於 B 的 8。C 14 分。'],

  ['pickup-window-route.wait-and-tie', ({ start, deadline, stops, travel }) => {
    const candidates = permutations(stops.map((_, i) => i)).flatMap(order => {
      let time = start, previous = 0;
      const visits = [];
      for (const index of order) {
        const stop = stops[index];
        const arrive = time + travel[previous][index + 1];
        const serveStart = Math.max(arrive, stop.open);
        const leave = serveStart + stop.service;
        if (leave > stop.close) return [];
        visits.push({ name: stop.name, arrive, serveStart, leave });
        time = leave; previous = index + 1;
      }
      const returnAt = time + travel[previous][0];
      return returnAt <= deadline ? [{ found: true, returnAt, visits }] : [];
    });
    return candidates.sort((a, b) => a.returnAt - b.returnAt)[0];
  }, identity, 'AB：25 離 A、33 離 B、38 返回。BA：15 離 B、30 離 A、38 返回。原序平手取 AB。'],

  ['card-sleeve-fit.reassign', ({ cards, sleeves, minGap, maxGap }) => {
    const fits = (c, s) => [s.w - c.w, s.h - c.h].every(gap => gap >= minGap && gap <= maxGap);
    const routes = permutations(sleeves).filter(order => order.every((sleeve, i) => fits(cards[i], sleeve)));
    return routes.map(ids)[0];
  }, r => r.cardRows.map(row => row.use[0].sleeve), '窮舉兩種全配。B 對 S2 的寬差 30 超上限 20，必留 S1 給 B，A 改 S2。'],

  ['bead-string-pattern.mirrored', ({ colors, motif, head, tail }) => {
    const sequence = [head, ...motif, ...[...motif].reverse(), tail];
    const first = sequence.findIndex((name, i) => sequence.slice(0, i + 1).filter(s => s === name).length > colors.find(c => c.name === name).stock);
    return [sequence, first + 1];
  }, r => [ids(r.positions), r.firstMissing], 'K,R,G,B,B,G,R,K 的 G 第二次出現在第 6 位，庫存只有 1。'],

  ['service-block-breakpoints.multiple-crossings', ({ maxVisits, plans: [a, b] }) => Array.from({ length: maxVisits + 1 }, (_, n) => {
    const x = a.blockMinor * Math.ceil(n / a.blockSize);
    const y = n * b.bands[0].rateMinor;
    return [x, y, x === y ? 'equal' : x < y ? 'A' : 'B'];
  }), r => r.visits.map(parts(['aMinor', 'bMinor', 'relation'])), '逐筆列 0..4 次，A 為 0,600,600,1200,1200，B 為 0,350,700,1050,1400。'],

  ['battery-swap-plan.gaps-and-shortage', ({ charged, devices }) => {
    const events = devices.flatMap((device, order) => {
      const active = device.runs.flatMap(r => Array.from({ length: r.end - r.start }, (_, i) => r.start + i)).sort((a, b) => a - b);
      return active.flatMap((minute, i) => i % device.runtime === 0 ? [{ minute, device: device.name, kind: i ? 'swap' : 'load', order }] : []);
    }).sort((a, b) => a.minute - b.minute || a.order - b.order);
    return events.map(({ order, ...event }, i) => ({ ...event, pack: i < charged ? i + 1 : null }));
  }, r => r.events, '獨立展開開機分鐘並每隔實測續航取一點。A 在 0、50，B 在 10、30，第四筆無備組。'],
];
