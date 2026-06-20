import { useState } from 'react';

export const useGroqBudget = () => {
  const [budgetExceeded, setBudgetExceeded] = useState(false);

  const handleBudgetError = (error) => {
    if (error?.response?.status === 429) {
      setBudgetExceeded(true);
      return true;
    }
    return false;
  };

  const resetBudgetFlag = () => setBudgetExceeded(false);

  return { budgetExceeded, handleBudgetError, resetBudgetFlag };
};
