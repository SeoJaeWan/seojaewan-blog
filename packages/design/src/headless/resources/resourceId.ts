declare const resourceIdBrand: unique symbol;

export type ResourceId = string & {
  readonly [resourceIdBrand]: "ResourceId";
};

const RESOURCE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidResourceIdError extends TypeError {
  constructor(value: unknown) {
    super(`ResourceId must be a valid UUID: ${String(value)}`);
    this.name = "InvalidResourceIdError";
  }
}

export const isResourceId = (value: unknown): value is ResourceId =>
  typeof value === "string" && RESOURCE_ID_PATTERN.test(value);

export const parseResourceId = (value: string): ResourceId => {
  if (!isResourceId(value)) {
    throw new InvalidResourceIdError(value);
  }

  return value;
};
