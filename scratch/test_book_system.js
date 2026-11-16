// Unit test script for Book System integration
import assert from 'node:assert';

// Mock browser globals for Node environment
globalThis.Image = class {
  constructor() {
    this.complete = true;
    this.naturalWidth = 32;
    this.naturalHeight = 32;
  }
};
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

import { BookSystem, BOOK_DEFINITIONS, STARTER_BOOK_IDS } from '../src/BookSystem.js';
import { BookDrop } from '../src/BookDrop.js';
import { MetaProgression } from '../src/MetaProgression.js';
import { Player } from '../src/Player.js';

console.log('--- 1. Testing Definitions & Initialization ---');
assert.strictEqual(Object.keys(BOOK_DEFINITIONS).length, 49, 'Should have exactly 49 books defined');
assert.strictEqual(STARTER_BOOK_IDS.length, 11, 'Should have exactly 11 starter books');

const bookSys = new BookSystem();
assert.strictEqual(bookSys.maxSlots, 3, 'Default slots should be 3');
bookSys.initRun(['freud'], 1); // 1 extra slot from meta upgrade = 4 slots
assert.strictEqual(bookSys.maxSlots, 4, 'Max slots with upgrade should be 4');
assert.strictEqual(bookSys.activeBooks.length, 1, 'Should have 1 active starter book');
assert.strictEqual(bookSys.activeBooks[0].id, 'freud');
assert(bookSys.unlockedCodex.has('freud'), 'Freud should be unlocked in Codex');

console.log('--- 2. Testing Kill Counting (Normal = 1, MiniBoss = 5, Boss = 10) ---');
bookSys.onEnemyKilled({ x: 0, y: 0 }, false, false); // +1 kill
assert.strictEqual(bookSys.progress['freud'].kills, 1);
bookSys.onEnemyKilled({ x: 0, y: 0 }, true, false);  // +5 kills
assert.strictEqual(bookSys.progress['freud'].kills, 6);
bookSys.onEnemyKilled({ x: 0, y: 0 }, false, true);  // +10 kills
assert.strictEqual(bookSys.progress['freud'].kills, 16);

// Simulate reaching 120 kills for Freud
for (let i = 0; i < 11; i++) {
  bookSys.onEnemyKilled({ x: 0, y: 0 }, false, true); // +110 kills -> total 126 kills
}
assert(bookSys.progress['freud'].readyToEvolve, 'Freud should be ready to evolve at 120 kills');
assert.strictEqual(bookSys.pendingEvolutions.length, 1);
assert.strictEqual(bookSys.pendingEvolutions[0].targetId, 'jung');

console.log('--- 3. Testing Evolution Execution ---');
const evolved = bookSys.evolveBook('freud', 'jung');
assert(evolved, 'Freud should successfully evolve into Jung');
assert.strictEqual(bookSys.activeBooks[0].id, 'jung');
assert(bookSys.unlockedCodex.has('jung'), 'Jung should now be unlocked in Codex');
assert.strictEqual(bookSys.progress['jung'].kills, 0, 'New tier kills should reset to 0');

console.log('--- 4. Testing Discard Functionality ---');
assert.strictEqual(bookSys.activeBooks.length, 1);
const discarded = bookSys.discardBook('jung');
assert(discarded, 'Should discard Jung');
assert.strictEqual(bookSys.activeBooks.length, 0, 'Active books should be 0');
assert(bookSys.discardedBooks.includes('jung'), 'Discard history should contain Jung');

console.log('--- 5. Testing Camus Secret Evolution (0 books after 60s) ---');
bookSys.initRun([]); // No starter book
assert.strictEqual(bookSys.activeBooks.length, 0);
bookSys.update(30, null);
assert.strictEqual(bookSys.activeBooks.length, 0, 'Camus should not trigger before 60s');
bookSys.update(35, null); // total 65s
assert(bookSys.hasBook('camus'), 'Camus should be awarded after 60s with 0 books');

console.log('--- 6. Testing Special Fusions (e.g. Dante, Dostoyevsky, Kafka) ---');
bookSys.initRun([], 2); // 5 slots
bookSys.addBook('aristoteles');
bookSys.addBook('virgil');
assert(bookSys.hasBook('dante'), 'Aristoteles + Virgil should automatically fuse into Dante');
assert(!bookSys.hasBook('aristoteles'), 'Ingredients should be consumed');
assert(!bookSys.hasBook('virgil'), 'Ingredients should be consumed');

bookSys.addBook('shakespeare');
bookSys.addBook('kant');
assert(bookSys.hasBook('dostoyevsky'), 'Shakespeare + Kant should fuse into Dostoyevsky');

bookSys.addBook('nietzsche');
assert(bookSys.hasBook('kafka'), 'Nietzsche + Dostoyevsky should fuse into Kafka');

console.log('--- 7. Testing 75% Caps on CDR & Damage Reduction ---');
const dummySys = new BookSystem();
dummySys.initRun([], 2);
dummySys.addBook('saussure');
dummySys.addBook('foucault');
const bonusStats = dummySys.getBonusStats();
assert(bonusStats.cooldownReduction <= 0.75, `CDR must be capped at 0.75, got ${bonusStats.cooldownReduction}`);
assert(bonusStats.damageReduction <= 0.75, `Damage reduction must be capped at 0.75, got ${bonusStats.damageReduction}`);

console.log('--- 8. Testing Lacan Extra Life Revival ---');
dummySys.addBook('lacan');
assert(dummySys.hasExtraLife(), 'Lacan should grant extra life');
const reviveHpRatio = dummySys.consumeExtraLife();
assert.strictEqual(reviveHpRatio, 0.50, 'Revive should heal 50% HP');
assert(!dummySys.hasExtraLife(), 'Extra life should be consumed');

console.log('--- 9. Testing MetaProgression Upgrades ---');
const meta = new MetaProgression();
assert(meta.upgrades.bookSlots !== undefined, 'Meta should have bookSlots');
assert(meta.upgrades.starterBooks !== undefined, 'Meta should have starterBooks');
meta.upgrades.bookSlots.level = 2;
meta.upgrades.starterBooks.level = 1;
const metaStats = meta.getBonusStats();
assert.strictEqual(metaStats.maxBookSlots, 5, 'Level 2 bookSlots should grant 5 slots');
assert.strictEqual(metaStats.maxStarterBooks, 2, 'Level 1 starterBooks should grant 2 starter books');

console.log('--- 10. Testing BookDrop Entity ---');
const drop = new BookDrop(100, 100, 'plato');
assert.strictEqual(drop.bookId, 'plato');
assert.strictEqual(drop.bookDef.work, 'Politeia');
const dummyPlayer = { x: 105, y: 105, pickupRangeBonus: 50 };
drop.update(0.016, dummyPlayer, dummySys, (bId, bDef) => {
  console.log(`Drop collected: ${bDef.work}`);
});
assert(drop.isDead, 'BookDrop should be collected when near player with free slot');

console.log('--- 11. Testing Player Combat Integration with BookSystem ---');
const p = new Player(0, 0);
p.setBookSystem(dummySys);
assert(p.bookStats !== null, 'Player should have bookStats computed');
const roll = p.rollDamage(100);
assert(roll.damage > 0, 'Damage roll should succeed');

console.log('--- 12. Testing No Books Challenge Setup ---');
const noBookSys = new BookSystem();
noBookSys.initRun([], 0);
noBookSys.maxSlots = 0;
assert.strictEqual(noBookSys.canPickUpMore(), false, 'Cannot pick up books when slots = 0');
assert.strictEqual(noBookSys.activeBooks.length, 0);

console.log('✅ ALL 12 TESTS PASSED PERFECTLY!');
