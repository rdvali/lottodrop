import React from 'react';
import type { Transaction } from '../../types';
import { Card, Badge } from '@components/atoms';
import { dateFormatters } from '../../utils/dateUtils';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions
}) => {
  if (!transactions.length) {
    return (
      <Card className="p-6 text-center text-gray-400">
        No transactions found
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-text-primary">
                  {transaction.description}
                </span>
                <Badge
                  variant={
                    transaction.status === 'completed'
                      ? 'success'
                      : transaction.status === 'pending'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                >
                  {transaction.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-400">
                {dateFormatters.historyTimestamp(transaction.createdAt)}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-lg font-bold ${
                  transaction.amount >= 0 ? 'text-success' : 'text-error'
                }`}
              >
                {transaction.amount >= 0 ? '+' : ''}
                ${Math.abs(transaction.amount || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 capitalize">
                {transaction.type.replace('_', ' ')}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TransactionHistory;