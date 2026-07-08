import { Request, Response } from 'express';
export default function logError(req: Request, res: Response) { console.log(req.body); res.status(200).send('ok'); }
