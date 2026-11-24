import mongoose from "mongoose";
import Transaction from "../../models/transaction.js";
import Notification from "../../models/notification.js";
import { LEDGER_TRANSACTION_TYPE, OWNER_TYPE } from "../../constants/finance.js";
import { creditWallet, getAdminFinanceSummary } from "../finance/walletService.js";
import { getLedgerEntries } from "../finance/ledgerService.js";

export async function getAdminWalletOverview({ page, limit }) {
  const stats = await getAdminFinanceSummary();
  const ledger = await getLedgerEntries({ page, limit });
  const transactionItems = ledger.items.map((entry) => ({
    id: entry.transactionId || entry.reference || String(entry._id),
    type: entry.type,
    amount:
      entry.direction === "DEBIT"
        ? -Math.abs(entry.amount || 0)
        : Math.abs(entry.amount || 0),
    status: entry.status,
    sender: entry.direction === "DEBIT" ? entry.actorType : "System/Order",
    recipient: entry.direction === "CREDIT" ? entry.actorType : "Platform Wallet",
    date: new Date(entry.createdAt).toLocaleDateString(),
    time: new Date(entry.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    notes: entry.description || entry.type,
    method: entry.paymentMode || "N/A",
  }));

  return {
    stats: {
      totalPlatformEarning: stats.totalPlatformEarning,
      totalAdminEarning: stats.totalAdminEarning,
      availableBalance: stats.availableBalance,
      sellerPendingPayouts: stats.sellerPendingPayouts,
      deliveryPendingPayouts: stats.deliveryPendingPayouts,
      systemFloat: stats.systemFloatCOD,
    },
    transactions: {
      items: transactionItems,
      page: ledger.page,
      limit: ledger.limit,
      total: ledger.total,
      totalPages: ledger.totalPages,
    },
  };
}

export async function getDeliveryTransactionsData({ page, limit, skip }) {
  const query = { userModel: "Delivery" };
  const transactions = await Transaction.find(query)
    .populate("user", "name phone documents")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Transaction.countDocuments(query);

  return {
    items: transactions,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getSellerWithdrawalsData({ page, limit, skip }) {
  const query = { userModel: "Seller", type: "Withdrawal" };

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .populate("user", "name shopName phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return {
    items: transactions,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getSellerTransactionsData({ page, limit, skip }) {
  const query = { userModel: "Seller" };
  const transactions = await Transaction.find(query)
    .populate("user", "name shopName phone bankDetails")
    .populate({
      path: "order",
      select: "orderId pricing",
      populate: {
        path: "items.product",
        select: "name",
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Transaction.countDocuments(query);

  return {
    items: transactions,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getDeliveryWithdrawalsData({ page, limit, skip }) {
  const query = { userModel: "Delivery", type: "Withdrawal" };

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .populate("user", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return {
    items: transactions,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function updateWithdrawalStatusById({ id, status, reason }) {
  if (!["Settled", "Failed", "Processing"].includes(status)) {
    throw new Error("Invalid status");
  }

  const transaction = await Transaction.findById(id).populate("user", "name");
  if (!transaction) {
    return null;
  }

  // Seller withdrawals created after the wallet-based flow already had the
  // amount debited from the Wallet at request time. Those must only move
  // forward once, and a Failed outcome has to give the money back.
  const walletBacked =
    transaction.userModel === "Seller" &&
    transaction.type === "Withdrawal" &&
    transaction.meta?.walletDebited === true;

  if (!walletBacked) {
    transaction.status = status;
    if (reason) {
      transaction.reason = reason;
    }
    await transaction.save();
    return transaction;
  }

  const previousStatus = transaction.status;
  if (previousStatus === "Settled" || previousStatus === "Failed") {
    throw new Error("Withdrawal already finalized");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      transaction.status = status;
      if (reason) {
        transaction.reason = reason;
      }

      if (status === "Failed" && !transaction.meta?.walletRefunded) {
        const refundAmount = Math.abs(transaction.amount || 0);
        if (refundAmount > 0) {
          await creditWallet({
            ownerType: OWNER_TYPE.SELLER,
            ownerId: transaction.user?._id || transaction.user,
            amount: refundAmount,
            session,
            ledgerType: LEDGER_TRANSACTION_TYPE.ADJUSTMENT,
            ledgerReference: transaction.reference,
            ledgerDescription: "Withdrawal rejected - amount returned to wallet",
            metadata: { flow: "seller_withdrawal_rejected" },
          });
        }
        transaction.meta = { ...(transaction.meta || {}), walletRefunded: true };
      }

      await transaction.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return transaction;
}

export async function settleDeliveryTransactionById(id) {
  const transaction = await Transaction.findByIdAndUpdate(
    id,
    { status: "Settled" },
    { new: true },
  ).populate("user", "name");

  if (!transaction) {
    return null;
  }

  await Notification.create({
    recipient: transaction.user._id,
    recipientModel: "Delivery",
    title: "Payment Settled",
    message: `Your payment of \u20B9${transaction.amount} has been settled.`,
    type: "payment",
    data: { transactionId: transaction._id },
  });

  return transaction;
}

export async function bulkSettleDeliveryTransactions() {
  return Transaction.updateMany(
    { userModel: "Delivery", status: "Pending" },
    { status: "Settled" },
  );
}
