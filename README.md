# query.js
Super simple GraphQL query function for Shopify storefront API.

## About
Query.js is a simple function that performs a GraphQL query without the extra bloat of dependencies like Apollo or urql, though they're recommended if you need more features (such as error handling or caching).

It supports arguments, aliases, nested fields and fragments, and variables in GraphQL fragments.

## Usage

First update the `store`, `token`, and `version` variables in _query.js_. I recommend using the [_Headless_ sales channel](https://shopify.dev/docs/custom-storefronts/building-with-the-storefront-api/manage-headless-channels) to create a token with storefront API permissions.

The below usage expects you to have a build tool setup to import and compile your GraphQL and JS files such as Webpack.

```js
import product from 'product.gql'
import Query from 'query'

try {
  const response = await Query({
    query: product,
    variables: {
      country: 'GB',
      handle: 'product-handle',
      locale: 'en',
    },
  })

  // Format response and use

} catch (error) {
  throw new Error('Failed to load product', error)
}
```

The response you receive will be an object with all the usual edges and nodes you'd expect from a GraphQL response.

It's recommended that you use Liquid to define the `locale` and `country` values using `{{ localization.language.iso_code | json }}` and `{{ localization.country.iso_code | json }}` respectively and pass them to JS.

> You should never use this to access the Admin API as your credentials will be publicly accessible.

### Cache

The latest version uses `sessionStorage` to cache the storefront API response. This allows query.js to instantly retrieve an API response if the same query is made in the same session.

This behaviour can be disabled by passing `false` to the `useCache` function argument on a use-by-use basis, or by changing `true` to `false` to disable it completely.
