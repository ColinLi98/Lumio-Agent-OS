import solutionHandler from '../[action].js';

export default async function handler(request: Request, response?: any) {
    if (response) {
        return solutionHandler(request as any, response);
    }
    return solutionHandler(request);
}
