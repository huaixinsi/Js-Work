import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateOrderTotal,
  createTicketCode,
  lockSeats
} from "./ticketing.js";

test("calculateOrderTotal applies member discount, coupon, and points", () => {
  const total = calculateOrderTotal({
    price: 58,
    seatCount: 3,
    memberDiscount: 0.9,
    couponAmount: 20,
    pointsUsed: 300
  });

  assert.equal(total, 133.6);
});

test("createTicketCode creates a readable pickup code", () => {
  const code = createTicketCode(42, "XM");

  assert.match(code, /^XM-0042-[A-Z0-9]{6}$/);
});

test("lockSeats locks only available seats and rejects sold seats", () => {
  const seats = [
    { id: 1, status: "available" },
    { id: 2, status: "sold" },
    { id: 3, status: "available" }
  ];

  assert.throws(() => lockSeats(seats, [1, 2]), /cannot be selected/);
  assert.deepEqual(lockSeats(seats, [1, 3]).map((seat) => seat.status), [
    "locked",
    "sold",
    "locked"
  ]);
});
