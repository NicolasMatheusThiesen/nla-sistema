import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    details?: unknown;
}
export declare const errorHandler: (err: AppError, req: Request, res: Response, _next: NextFunction) => void;
export declare const notFound: (req: Request, res: Response) => void;
//# sourceMappingURL=errorHandler.d.ts.map