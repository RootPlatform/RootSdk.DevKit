---
path: app-api-reference/server/type-aliases/JobScheduler.md
audience: app
category: reference
summary: Represents a job scheduling system that notifies you when it's time for one of your tasks to run.
---

> **JobScheduler** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`JobScheduleEvents`](JobScheduleEvents.md)> & `object`

Represents a job scheduling system that notifies you when it's time for one of your tasks to run. The job scheduler doesn't run your tasks, it notifies you via an event at the scheduled time so you can run the task yourself.

## Type Declaration

### create()

> **create**(`data`: [`JobCreateRequest`](JobCreateRequest.md)): `Promise`<[`JobRecord`](JobRecord.md)>

Creates a new job.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | [`JobCreateRequest`](JobCreateRequest.md) | The details of the job to be created. |

#### Returns

`Promise`<[`JobRecord`](JobRecord.md)>

A promise that resolves with the created job record. The returned object contains all the same values you passed in the create request with one difference: it adds the `jobScheduleId` that the `JobScheduler` created to uniquely identify this job. You'll need the `jobScheduleId` to uniquely identify this job in edit or delete operations.

#### Example

```ts
import {
  JobCreateRequest,
  JobRecord,
  rootServer,
  JobInterval,
} from "@rootsdk/server-app";

export async function createExample(
  resourceId: string,
  tag: string | null | undefined,
  jobInterval: JobInterval,
  start: Date,
  end: Date | undefined,
): Promise<JobRecord> {
  try {
    // Set up the request
    const request: JobCreateRequest = {
      resourceId: resourceId,
      tag: tag,
      jobInterval: jobInterval,
      start: start,
      end: end,
    };

    // Call the API
    const result: JobRecord = await rootServer.jobScheduler.create(request);

    return result;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### delete()

> **delete**(`jobScheduleId`: `string`): `Promise`<`void`>

Deletes a job by its ID. The `jobScheduleId` will be unique, so this method will delete at most one job.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `jobScheduleId` | `string` | The unique identifier for the job schedule. |

#### Returns

`Promise`<`void`>

A promise that resolves when the job is deleted. It's not considered an error if the parameter you pass doesn't match any jobs. If needed, you can use `get` or `list` to determine whether your parameters will match an existing job.

#### Example

```ts
import {
  rootServer,
} from "@rootsdk/server-app";

export async function deleteExample(jobScheduleId: string): Promise<void> {
  try {
    // Call the API
    await rootServer.jobScheduler.delete(jobScheduleId);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### deleteByResourceId()

> **deleteByResourceId**(`resourceId`: `string`): `Promise`<`void`>

Deletes all jobs associated with a specific resource ID. The `resourceId` doesn't need to be unique, so this method might delete multiple jobs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `resourceId` | `string` | The unique identifier for the resource. |

#### Returns

`Promise`<`void`>

A promise that resolves when the jobs are deleted. It's not considered an error if the parameter you pass doesn't match any jobs. If needed, you can use `get` or `list` to determine whether your parameters will match any jobs.

#### Example

```ts
import { rootServer } from "@rootsdk/server-app";

export async function deleteByResourceIdExample(
  resourceId: string,
): Promise<void> {
  try {
    // Call the API
    await rootServer.jobScheduler.deleteByResourceId(resourceId);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### deleteByTag()

> **deleteByTag**(`tag`: `string` | `null` | `undefined`): `Promise`<`void`>

Deletes all jobs associated with a specific tag. The `tag` doesn't need to be unique, so this method might delete multiple jobs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tag` | `string` | `null` | `undefined` | The tag associated with the jobs. |

#### Returns

`Promise`<`void`>

A promise that resolves when the jobs are deleted. It's not considered an error if the parameter you pass doesn't match any jobs. If needed, you can use `get` or `list` to determine whether your parameters will match any jobs.

#### Example

```ts
import { rootServer } from "@rootsdk/server-app";

export async function deleteByTagExample(
  tag: string | undefined | null,
): Promise<void> {
  try {
    // Call the API
    await rootServer.jobScheduler.deleteByTag(tag);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### edit()

> **edit**(`data`: [`JobRecord`](JobRecord.md)): `Promise`<`void`>

Updates an existing job record. You pass a `JobRecord` containing a `jobScheduleId`; this guarantees a unique match to a single job. You can pass new values for everything inside the `JobRecord` parameter except the `jobScheduleId` (since it's what determines which existing job you'll be modifying).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | [`JobRecord`](JobRecord.md) | The updated job record. |

#### Returns

`Promise`<`void`>

A promise that resolves when the job is updated. It's not considered an error if the parameter you pass doesn't match any jobs. You can use the `get` method to determine whether your `jobScheduleId` will match an existing job.

#### Example

```ts
import {
  JobRecord,
  rootServer,
} from "@rootsdk/server-app";

export async function editExample(job: JobRecord): Promise<void> {
  try {
    // Call the API
    await rootServer.jobScheduler.edit(job);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### get()

> **get**(`jobScheduleId`: `string`): `Promise`<[`JobRecord`](JobRecord.md) | `undefined`>

Retrieves a single job by its schedule ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `jobScheduleId` | `string` | The unique identifier for the job schedule. |

#### Returns

`Promise`<[`JobRecord`](JobRecord.md) | `undefined`>

A promise that resolves with the job record if found, otherwise `undefined`.

#### Example

```ts
import {
  JobRecord,
  rootServer,
} from "@rootsdk/server-app";

export async function getExample(
  jobScheduleId: string,
): Promise<JobRecord | undefined> {
  try {
    // Call the API
    const result: JobRecord | undefined =
      await rootServer.jobScheduler.get(jobScheduleId);

    return result;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### list()

> **list**(): `Promise`<[`JobRecord`](JobRecord.md)[]>

Lists all jobs in a community.

#### Returns

`Promise`<[`JobRecord`](JobRecord.md)[]>

A promise that resolves with an array of job records. The array will be empty if no jobs were found.

#### Example

```ts
import { JobRecord, rootServer } from "@rootsdk/server-app";

export async function listExample(): Promise<JobRecord[]> {
  try {
    // Call the API
    const results: JobRecord[] = await rootServer.jobScheduler.list();

    return results;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listByResourceId()

> **listByResourceId**(`resourceId`: `string`): `Promise`<[`JobRecord`](JobRecord.md)[]>

Lists all jobs associated with a specific resource ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `resourceId` | `string` | The unique identifier for the resource. |

#### Returns

`Promise`<[`JobRecord`](JobRecord.md)[]>

A promise that resolves with an array of job records.

#### Example

```ts
import { JobRecord, rootServer } from "@rootsdk/server-app";

export async function listByResourceIdExample(
  resourceId: string,
): Promise<JobRecord[]> {
  try {
    // Call the API
    const results: JobRecord[] =
      await rootServer.jobScheduler.listByResourceId(resourceId);

    return results;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listByTag()

> **listByTag**(`tag`: `string` | `null` | `undefined`): `Promise`<[`JobRecord`](JobRecord.md)[]>

Lists all jobs associated with a specific tag.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tag` | `string` | `null` | `undefined` | The tag associated with the jobs. |

#### Returns

`Promise`<[`JobRecord`](JobRecord.md)[]>

A promise that resolves with an array of job records.

#### Example

```ts
import { JobRecord, rootServer } from "@rootsdk/server-app";

export async function listByTagExample(
  tag: string | undefined,
): Promise<JobRecord[]> {
  try {
    // Call the API
    const results: JobRecord[] = await rootServer.jobScheduler.listByTag(tag);

    return results;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```