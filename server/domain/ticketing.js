export function calculateOrderTotal({
  price,
  seatCount,
  memberDiscount = 1,
  couponAmount = 0,
  pointsUsed = 0
}) {
  const pointsDeduction = pointsUsed / 100;
  const total = price * seatCount * memberDiscount - couponAmount - pointsDeduction;
  return Math.max(0, Math.round(total * 100) / 100);
}

export function createTicketCode(orderId, prefix = "XM") {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  return `${prefix}-${String(orderId).padStart(4, "0")}-${random}`;
}

export function lockSeats(seats, selectedIds) {
  const selected = new Set(selectedIds);
  const invalid = seats.find((seat) => selected.has(seat.id) && seat.status !== "available");

  if (invalid) {
    throw new Error(`Seat ${invalid.id} cannot be selected`);
  }

  return seats.map((seat) => (
    selected.has(seat.id) ? { ...seat, status: "locked" } : seat
  ));
}
