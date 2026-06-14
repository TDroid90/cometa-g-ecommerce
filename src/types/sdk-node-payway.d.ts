declare module "sdk-node-payway" {
  export class sdk {
    constructor(
      environment: "developer" | "production" | "desarrollo" | "qa",
      publicKey: string,
      privateKey: string,
      company: string,
      user: string,
      consumer?: string
    );

    checkout(
      args: Record<string, unknown>,
      callback: (result: Record<string, unknown>, error: unknown) => void
    ): void;

    payment(
      args: Record<string, unknown>,
      callback: (result: Record<string, unknown>, error: unknown) => void
    ): void;
  }
}
