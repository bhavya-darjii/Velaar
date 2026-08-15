/* eslint-disable */
// @ts-nocheck
import { createContext, useContext, useState, useCallback } from 'react';

const CopilotContext = createContext(null);

export const CopilotProvider = ({ children }) => {
  const [pageContext, setPageContextState] = useState({});

  const setPageContext = useCallback((ctx) => {
    setPageContextState((prev) => ({ ...prev, ...ctx }));
  }, []);

  const clearPageContext = useCallback(() => {
    setPageContextState({});
  }, []);

  return (
    <CopilotContext.Provider value={{ pageContext, setPageContext, clearPageContext }}>
      {children}
    </CopilotContext.Provider>
  );
};

export const useCopilotContext = () => {
  const ctx = useContext(CopilotContext);
  if (!ctx) return { pageContext: {}, setPageContext: () => {}, clearPageContext: () => {} };
  return ctx;
};

