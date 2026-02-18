export type User = { id: string; name: string; email: string };

export type Notebook = {
  _id: string;
  title: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  _id: string;
  title: string;
  content?: string;
  pinned: boolean;
  notebook?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
