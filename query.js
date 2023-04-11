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
 * @param {Object} data.query - GraphQL query.
 * @param {Object} data.variables - GraphQL variables.
 * @returns {Promise}
 */
export default ({ query: graphqlQuery, variables }) => {
  return new Promise(async(resolve, reject) => {
    try {
      const store = 'store_name'
      const token = 'storefront_api_token'
      const version = '2023-04'
      const url = `https://${store}.myshopify.com/api/${version}/graphql.json`

      /**
       * Set headers.
       */
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      }

      /**
       * Add language header.
       * - Also splits off language country as this isn't supported.
       * - E.g. ZH-CN doesn't work, but ZH does.
       */
      if (variables?.language) {
        const formattedLanguage = variables.language.toUpperCase().split('-')[0]
        headers['Accept-Language'] = formattedLanguage
        variables.language = formattedLanguage
      }

      /**
       * Fetch response.
       */
      let response = await fetch(url, {
        body: JSON.stringify({
          query: buildQuery(graphqlQuery),
          variables,
        }),
        headers,
        method: 'POST',
      })

      if (!response.ok) {
        reject(response.description)
        return
      }

      response = await response.json()
      resolve(response.data)

    } catch (error) {
      reject(error)
    }
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
    let formattedValue = value

    /**
     * Resolves nested fragments.
     */
    Object.entries(fragments).forEach(([fragmentKey, fragmentValue]) => {
      formattedValue = value.replace(`...${fragmentKey}`, fragmentValue)
    })

    query = query.replace(`...${key}`, formattedValue)
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
      ? `${selection.alias?.value}: ${selection.name?.value}`
      : selection.name?.value

    /**
     * Inline fragments.
     */
    if (selection.kind === 'InlineFragment') {
      field = `... on ${selection.typeCondition.name.value}`
    }

    /**
     * Preserves fragment syntax.
     */
    if (selection.kind === 'FragmentSpread') {
      field = `...${selection.name.value}`
    }

    /**
     * If field has argument append to variable.
     */
    if (selection.arguments?.length) {
      const args = selection.arguments.map((argument) => {
        let value = argument.value.value

        switch (argument.value.kind) {
          case 'ListValue':
            value = buildListArgumentValue(argument)
            break

          case 'StringValue':
            value = `"${argument.value.value}"`
            break

          case 'Variable':
            value = `$${argument.value.name.value}`
            break
        }

        return `${argument.name.value}: ${value}`
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

/**
 * Builds value of argument when it's a list value (array of objects).
 * @param {Object} argument - AST format argument object.
 * @returns {String}
 */
function buildListArgumentValue(argument) {
  const values = argument.value.values.map((value) => {
    const fields = value.fields.map((field) => {
      return `${field.name.value}: "${field.value.value}"`
    })

    return `{${fields.join(', ')}}`
  })

  return `[${values.join(', ')}]`
}
