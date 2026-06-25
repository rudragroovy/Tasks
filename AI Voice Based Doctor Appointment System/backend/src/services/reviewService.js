function roundToSingleDecimal(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.round(numericValue * 10) / 10;
}

async function recalculateDoctorReviewStats(tx, doctorId) {
  const [aggregateResult, reviewCount] = await Promise.all([
    tx.review.aggregate({
      where: { doctorId, isVisible: true },
      _avg: { rating: true },
    }),
    tx.review.count({
      where: { doctorId, isVisible: true },
    }),
  ]);

  const averageRating = roundToSingleDecimal(aggregateResult?._avg?.rating || 0);

  return tx.doctor.update({
    where: { userId: doctorId },
    data: {
      averageRating,
      reviewCount,
    },
    select: {
      userId: true,
      averageRating: true,
      reviewCount: true,
    },
  });
}

module.exports = {
  recalculateDoctorReviewStats,
  roundToSingleDecimal,
};
