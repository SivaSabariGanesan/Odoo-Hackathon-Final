export class MappingService {
  mapOrderStatusToCustomerFacing(status: string): string {
    const mapping: Record<string, string> = {
      "DRAFT": "In Cart",
      "SENT_TO_KITCHEN": "Order Placed",
      "PREPARING": "Preparing",
      "READY": "Ready for Pickup",
      "PAID": "Completed",
      "CANCELLED": "Cancelled",
    };
    return mapping[status] || "Unknown";
  }
}

export const mappingService = new MappingService();
