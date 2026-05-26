export type KeyOfClass<Class> = {
  [key in keyof Class]: NonNullable<Class[key]> extends Date
    ? string
    : Class[key] extends infer T
      ? T
      : never;
};

export type KeyOfOmitClass<Class, K extends keyof Class> = Omit<
  KeyOfClass<Class>,
  K
>;

export type KeyOfPartialClass<Class> = Partial<KeyOfClass<Class>>;
