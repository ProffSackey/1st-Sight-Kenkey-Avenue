export type ItemRow = {
  id: string;
  branchId: string;
  addedBy: string;
  name: string;
  category: string;
  size: string;
  branch: string;
  timeAdded: {
    date: string;
    time: string;
  };
  stock: number;
  price: string;
};

export type ItemFormValues = {
  branch: string;
  branchId: string;
  name: string;
  category: string;
  size: string;
  stock: string;
  price: string;
};

export const adminItemsStorageKey = 'admin-items';
export const adminItemCategoriesStorageKey = 'admin-item-categories';

export const initialItemRows: ItemRow[] = [];

export const initialCategories = [...new Set(initialItemRows.map((item) => item.category))].sort();

export const parsePrice = (value: string) => Number(value.replace('GHC', '').replace(/,/g, ''));

export const createEmptyItemForm = (): ItemFormValues => ({
  branch: '',
  branchId: '',
  name: '',
  category: '',
  size: '',
  stock: '',
  price: '',
});
