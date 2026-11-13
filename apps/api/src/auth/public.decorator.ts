import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Everything is private by default; this opts a controller or route out of the session guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
