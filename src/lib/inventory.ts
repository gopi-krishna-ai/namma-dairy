import { prisma } from './prisma';

export {
  calculateWeightMultiplier,
  getWeightMultiplier,
  calculateItemUnitPrice,
  validateWeightOption,
  validateCuttingOption,
  validateQuantity,
} from './pricing';

import {
  calculateWeightMultiplier,
  validateWeightOption,
  validateCuttingOption,
  validateQuantity,
} from './pricing';


/**
 * Conditionally reserves inventory inside a Prisma transaction.
 * In SQLite, updateMany with a WHERE condition (`stockQuantity >= required`) guarantees
 * atomic decrement and prevents overselling even under high concurrency.
 */
export async function reserveStockForItems(
  tx: any,
  items: Array<{
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    stockMultiplier: number;
  }>
): Promise<void> {
  for (const item of items) {
    const requiredStock = item.quantity * item.stockMultiplier;

    const updateResult = await tx.product.updateMany({
      where: {
        id: item.productId,
        isAvailable: true,
        stockQuantity: {
          gte: requiredStock,
        },
      },
      data: {
        stockQuantity: {
          decrement: requiredStock,
        },
      },
    });

    if (updateResult.count === 0) {
      throw new Error(
        `Insufficient stock for "${item.productName}". The requested quantity (${requiredStock} ${item.unit}) exceeds currently available inventory.`
      );
    }
  }
}

/**
 * Restores reserved inventory when an eligible order is cancelled.
 */
export async function restoreStockForOrder(tx: any, orderId: string): Promise<{ restored: boolean; message: string }> {
  const order = await tx.order.findFirst({
    where: {
      OR: [{ id: orderId }, { orderNumber: orderId }],
    },
    include: { items: true },
  });

  if (!order) {
    throw new Error('Order not found.');
  }

  if (!order.inventoryReserved) {
    return { restored: false, message: 'Order never had inventory reserved; no restoration needed.' };
  }

  if (order.inventoryRestored) {
    return { restored: false, message: 'Inventory for this order has already been restored previously.' };
  }

  for (const item of order.items) {
    if (item.productId) {
      const multiplier = calculateWeightMultiplier(item.selectedWeight);
      const restoreQty = item.quantity * multiplier;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            increment: restoreQty,
          },
        },
      });
    }
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      inventoryRestored: true,
    },
  });

  return { restored: true, message: 'Reserved inventory successfully restored to catalog.' };
}
