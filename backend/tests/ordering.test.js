"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ordering_1 = require("../src/modules/tasks/ordering");
describe('fractional ordering', () => {
    it('handles empty, first, last, and middle positions', () => {
        expect((0, ordering_1.computePosition)(null, null)).toBe(ordering_1.INITIAL_GAP);
        expect((0, ordering_1.computePosition)(null, 1024)).toBe(512);
        expect((0, ordering_1.computePosition)(1024, null)).toBe(2048);
        expect((0, ordering_1.computePosition)(1024, 2048)).toBe(1536);
    });
    it('requests a rebalance when the gap is exhausted', () => {
        expect((0, ordering_1.computePosition)(1, 1 + ordering_1.MIN_GAP / 2)).toBeNull();
        expect((0, ordering_1.rebalancedPositions)(3)).toEqual([1024, 2048, 3072]);
    });
});
