import { useState, useCallback, useMemo } from "react";

export interface POBCartItem {
  id: string;
  type: 'lpg' | 'stove' | 'regulator';
  name: string;
  details: string;
  companyPrice: number;
  quantity: number;
  cylinderType?: 'refill' | 'package';
  brandId?: string;
  stoveId?: string;
  regulatorId?: string;
  weight?: string;
  valveSize?: string;
  brandColor?: string;
  burnerType?: 'single' | 'double';
  model?: string;
  regulatorType?: string;
}

export interface POBFormState {
  // LPG
  lpgBrandName: string;
  lpgCylinderType: 'refill' | 'package';
  lpgWeight: string;
  lpgQty22mm: number;
  lpgQty20mm: number;
  lpgTotalDO: number;
  // Stove
  stoveBrand: string;
  stoveModel: string;
  stoveQtySingle: number;
  stoveQtyDouble: number;
  stoveTotalAmount: number;
  // Regulator
  regulatorBrand: string;
  regQty22mm: number;
  regQty20mm: number;
  regulatorTotalAmount: number;
}

const initialFormState: POBFormState = {
  lpgBrandName: "",
  lpgCylinderType: "refill",
  lpgWeight: "12kg",
  lpgQty22mm: 0,
  lpgQty20mm: 0,
  lpgTotalDO: 0,
  stoveBrand: "",
  stoveModel: "",
  stoveQtySingle: 0,
  stoveQtyDouble: 0,
  stoveTotalAmount: 0,
  regulatorBrand: "",
  regQty22mm: 0,
  regQty20mm: 0,
  regulatorTotalAmount: 0,
};

export function usePOBCart() {
  const [items, setItems] = useState<POBCartItem[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [pobMode, setPobMode] = useState<'buy' | 'add'>('buy');
  const [mobileStep, setMobileStep] = useState<'product' | 'cart'>('product');
  const [showSupplierInput, setShowSupplierInput] = useState(false);
  const [formState, setFormState] = useState<POBFormState>(initialFormState);

  // Computed quantities
  const lpgTotalQty = formState.lpgQty22mm + formState.lpgQty20mm;
  const stoveTotalQty = formState.stoveQtySingle + formState.stoveQtyDouble;
  const regTotalQty = formState.regQty22mm + formState.regQty20mm;

  // Computed prices
  const lpgCompanyPrice = useMemo(() => {
    if (lpgTotalQty <= 0 || formState.lpgTotalDO <= 0) return 0;
    return Math.round(formState.lpgTotalDO / lpgTotalQty);
  }, [lpgTotalQty, formState.lpgTotalDO]);

  const stoveCompanyPrice = useMemo(() => {
    if (stoveTotalQty <= 0 || formState.stoveTotalAmount <= 0) return 0;
    return Math.round(formState.stoveTotalAmount / stoveTotalQty);
  }, [stoveTotalQty, formState.stoveTotalAmount]);

  const regulatorCompanyPrice = useMemo(() => {
    if (regTotalQty <= 0 || formState.regulatorTotalAmount <= 0) return 0;
    return Math.round(formState.regulatorTotalAmount / regTotalQty);
  }, [regTotalQty, formState.regulatorTotalAmount]);

  // Cart calculations
  const subtotal = useMemo(() => 
    items.reduce((sum, item) => sum + item.companyPrice * item.quantity, 0), 
    [items]
  );

  const totalQty = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0), 
    [items]
  );

  // Cart operations
  const addItem = useCallback((item: POBCartItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  const addItems = useCallback((newItems: POBCartItem[]) => {
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Form state updaters
  const updateFormField = useCallback(<K extends keyof POBFormState>(
    field: K, 
    value: POBFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Reset forms
  const resetLPGForm = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      lpgBrandName: "",
      lpgCylinderType: "refill",
      lpgWeight: "12kg",
      lpgQty22mm: 0,
      lpgQty20mm: 0,
      lpgTotalDO: 0,
    }));
  }, []);

  const resetStoveForm = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      stoveBrand: "",
      stoveModel: "",
      stoveQtySingle: 0,
      stoveQtyDouble: 0,
      stoveTotalAmount: 0,
    }));
  }, []);

  const resetRegulatorForm = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      regulatorBrand: "",
      regQty22mm: 0,
      regQty20mm: 0,
      regulatorTotalAmount: 0,
    }));
  }, []);

  const resetAllForms = useCallback(() => {
    setFormState(initialFormState);
    setItems([]);
    setMobileStep('product');
    setPobMode('buy');
    setSupplierName("");
    setShowSupplierInput(false);
  }, []);

  return {
    // Cart state
    items,
    subtotal,
    totalQty,
    
    // Cart operations
    addItem,
    addItems,
    removeItem,
    clearCart,
    
    // Mode
    pobMode,
    setPobMode,
    mobileStep,
    setMobileStep,
    
    // Supplier
    supplierName,
    setSupplierName,
    showSupplierInput,
    setShowSupplierInput,
    
    // Form state
    formState,
    updateFormField,
    
    // Computed quantities
    lpgTotalQty,
    stoveTotalQty,
    regTotalQty,
    
    // Computed prices
    lpgCompanyPrice,
    stoveCompanyPrice,
    regulatorCompanyPrice,
    
    // Reset functions
    resetLPGForm,
    resetStoveForm,
    resetRegulatorForm,
    resetAllForms,
  };
}
