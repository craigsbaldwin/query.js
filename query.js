/**
 * Core: Query
 * -----------------------------------------------------------------------------
 * GraphQL query tool, acts as a replacement for Apollo.
 * - Do not query admin API from JS as you will need to publicly store the API
 *   access token and password which is a security risk.
 *
 */

/**
 * Query storefront API.
 * @param {Object} data - Parameters.
 * @param {String} [data.locale] - Locale code to load translated content.
 * @param {Object} data.query - GraphQL query.
 * @param {Object} data.variables - GraphQL variables.
 * @returns {Promise}
 */
 export default ({ locale, query: graphqlQuery, variables }) => {
  const store = 'store_name'
  const token = 'storefront_api_token'
  const version = '2021-10'

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': token,
  }

  if (locale) {
    headers['Accept-Language'] = locale.toLowerCase()
  }

  return new Promise((resolve, reject) => {
    fetch(`https://${store}.myshopify.com/api/${version}/graphql.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: buildQuery(graphqlQuery),
        variables,
      }),
    })
      .then((response) => response.json())
      .then((response) => {
        resolve(response.data)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

/**
 * Build GraphQL query string from AST format data.
 * @param {Object} query - AST format GraphQL query.
 * @returns {String}
 */
function buildQuery(astData) {

  /**
   * Uses body source as starting point.
   * - Remove import tags.
   */
  let query = astData.loc.source.body
    .replace(/#import.*\n/g, '')
    .trim()

  const fragments = {}

  /**
   * Go through each fragment definition and build query string.
   */
  astData.definitions.forEach((definition) => {
    if (definition.kind !== 'FragmentDefinition') {
      return
    }

    const fields = buildFields(definition.selectionSet.selections)
    fragments[definition.name.value] = fields.join('\n')
  })

  /**
   * Replace fragment object with query.
   */
  Object.entries(fragments).forEach(([key, value]) => {
    query = query.replace(`...${key}`, value)
  })

  return query
}

/**
 * Build fields from selection sets.
 * - Supports arguments and nested fields.
 * @param {Array} selections - Selections array of objects.
 * @returns {String}
 */
function buildFields(selections) {
  return selections.map((selection) => {
    let field = selection.alias
      ? `${selection.alias.value}: ${selection.name.value}`
      : selection.name.value

    /**
     * If field has argument append to variable.
     */
    if (selection.arguments?.length) {
      const args = selection.arguments.map((argument) => {
        return `${argument.name.value}: ${argument.value.value}`
      })

      field += `(${args.join(', ')})`
    }

    /**
     * If field has nested fields then append to variable.
     */
    if (selection.selectionSet) {
      const fields = buildFields(selection.selectionSet.selections)
      field += ` {\n${fields.join('\n')}\n}`
    }

    return field
  })
}
