'use client';

import React from 'react';
import { X, Printer, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { Order } from '@/lib/types';
import NammaLogo from './NammaLogo';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  if (!order) return null;

  let addressObj: any = {};
  try {
    addressObj = typeof order.deliveryAddress === 'string' ? JSON.parse(order.deliveryAddress) : order.deliveryAddress;
  } catch (e) {
    addressObj = {};
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8 print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 print:hidden">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Tax Invoice & Order Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="pt-4 text-gray-800 print:pt-0" id="printable-invoice">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-gray-200 pb-6">
            <div>
              <NammaLogo size="md" />
              <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
                Namma Dairy Farm Hub, Old Madras Road, Indiranagar, Bengaluru, Karnataka - 560038
                <br />
                Helpline: +91 98765 43210 • care@nammadairy.com
                <br />
                FSSAI Lic. No: 11223334000123
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs uppercase tracking-wider font-extrabold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                TAX INVOICE
              </span>
              <p className="text-sm font-bold text-gray-900 mt-2">Order #: {order.orderNumber}</p>
              <p className="text-xs text-gray-500">Date: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="text-xs text-gray-500">Slot: {order.deliverySlot}</p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle className="w-3 h-3" />
                <span>Payment: {order.paymentMethod} ({order.paymentStatus})</span>
              </div>
            </div>
          </div>

          {/* Customer / Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-gray-100 text-xs">
            <div>
              <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">Delivered To:</span>
              <p className="font-bold text-gray-900 text-sm">{addressObj.recipientName || order.user?.name}</p>
              <p className="text-gray-600 mt-0.5">{addressObj.houseNumber}, {addressObj.street}</p>
              <p className="text-gray-600">{addressObj.area}, {addressObj.city} - {addressObj.pincode}</p>
              <p className="text-gray-600 font-semibold mt-1">Phone: {addressObj.phone || order.user?.phone}</p>
            </div>

            <div className="sm:text-right">
              <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">Fulfillment Details:</span>
              <p className="text-gray-700 font-medium">Hub: Bengaluru East Cold Hub</p>
              <p className="text-gray-700">Delivery Status: <strong className="text-brand-800">{order.status}</strong></p>
              {order.orderNotes && (
                <p className="text-gray-500 italic mt-1">&quot;{order.orderNotes}&quot;</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-left">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-center">Cut / Fraction</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="py-2">
                    <td className="py-2.5 font-bold text-gray-900">{item.productName}</td>
                    <td className="py-2.5 text-center text-gray-600">
                      {item.selectedWeight} {item.selectedCut ? `(${item.selectedCut})` : ''}
                    </td>
                    <td className="py-2.5 text-center font-bold text-gray-800">{item.quantity}</td>
                    <td className="py-2.5 text-right text-gray-600">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold text-gray-900">₹{item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="border-t border-gray-200 pt-4 flex flex-col items-end text-xs space-y-1.5">
            <div className="flex justify-between w-64 text-gray-600">
              <span>Item Subtotal:</span>
              <span className="font-bold text-gray-900">₹{order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between w-64 text-emerald-700">
                <span>Coupon Savings:</span>
                <span className="font-bold">-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 text-gray-600">
              <span>Cold-Chain Delivery:</span>
              <span className="font-bold text-gray-900">
                {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between w-64 text-sm font-extrabold text-brand-950 border-t border-gray-300 pt-2 mt-1">
              <span>Grand Total:</span>
              <span className="text-base font-display">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-dashed border-gray-200 text-center text-[10px] text-gray-400 space-y-1">
            <p>Thank you for choosing Namma Dairy! We guarantee 100% pure milk and farm-fresh butchery.</p>
            <p>For any quality or delivery queries, contact +91 98765 43210 or care@nammadairy.com.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
