---
type: BigQuery Table
title: Orders
description: One row per completed customer order.
resource: https://console.cloud.google.com/bigquery?p=acme&d=sales&t=orders
tags: [sales, orders]
timestamp: 2026-05-28T00:00:00Z
difficulty: intermediate
---

# Schema

`customer_id` joins to [Customers](./customers.md).

# Quality

See [Revenue Metric](/metrics/revenue.md) and [Missing](/tables/missing.md).

# Citations

[1] [BigQuery table schema](https://cloud.google.com/bigquery)
