/** @jsxRuntime classic */

/** @jsx jsx */
import { useState } from 'react';
import { jsx, Stack } from '@keystone-ui/core';
import isDeepEqual from 'fast-deep-equal';
import { useToasts } from '@keystone-ui/toast';
import { Button } from '@keystone-ui/button';
import { makeDataGetter, useInvalidFields, serializeValueToObjByFieldKey, Fields } from '@keystone-6/core/admin-ui/utils';
import { gql, useMutation } from '@keystone-6/core/admin-ui/apollo';
import { GraphQLErrorNotice } from '@keystone-6/core/admin-ui/components';
import { useFieldsObj } from './useItemState';
export function InlineCreate({
  list,
  onCancel,
  onCreate,
  fields: fieldPaths,
  selectedFields
}) {
  const toasts = useToasts();
  const fields = useFieldsObj(list, fieldPaths);
  const [createItem, {
    loading,
    error
  }] = useMutation(gql`mutation($data: ${list.gqlNames.createInputName}!) {
      item: ${list.gqlNames.createMutationName}(data: $data) {
        ${selectedFields}
    }
  }`);
  const [value, setValue] = useState(() => {
    const value = {};
    Object.keys(fields).forEach(fieldPath => {
      value[fieldPath] = {
        kind: 'value',
        value: fields[fieldPath].controller.defaultValue
      };
    });
    return value;
  });
  const invalidFields = useInvalidFields(fields, value);
  const [forceValidation, setForceValidation] = useState(false);

  const onCreateClick = () => {
    const newForceValidation = invalidFields.size !== 0;
    setForceValidation(newForceValidation);
    if (newForceValidation) return;
    const data = {};
    const allSerializedValues = serializeValueToObjByFieldKey(fields, value);
    Object.keys(allSerializedValues).forEach(fieldPath => {
      const {
        controller
      } = fields[fieldPath];
      const serialized = allSerializedValues[fieldPath];

      if (!isDeepEqual(serialized, controller.serialize(controller.defaultValue))) {
        Object.assign(data, serialized);
      }
    });
    createItem({
      variables: {
        data
      }
    }).then(({
      data,
      errors
    }) => {
      // we're checking for path.length === 1 because errors with a path larger than 1 will be field level errors
      // which are handled seperately and do not indicate a failure to update the item
      const error = errors === null || errors === void 0 ? void 0 : errors.find(x => {
        var _x$path;

        return ((_x$path = x.path) === null || _x$path === void 0 ? void 0 : _x$path.length) === 1;
      });

      if (error) {
        toasts.addToast({
          title: 'Failed to create item',
          tone: 'negative',
          message: error.message
        });
      } else {
        toasts.addToast({
          title: data.item[list.labelField] || data.item.id,
          tone: 'positive',
          message: 'Saved successfully'
        });
        onCreate(makeDataGetter(data, errors).get('item'));
      }
    }).catch(err => {
      toasts.addToast({
        title: 'Failed to update item',
        tone: 'negative',
        message: err.message
      });
    });
  };

  return jsx(Stack, {
    gap: "xlarge"
  }, error && jsx(GraphQLErrorNotice, {
    networkError: error === null || error === void 0 ? void 0 : error.networkError,
    errors: error === null || error === void 0 ? void 0 : error.graphQLErrors
  }), jsx(Fields, {
    fieldModes: null,
    fields: fields,
    forceValidation: forceValidation,
    invalidFields: invalidFields,
    onChange: setValue,
    value: value
  }), jsx(Stack, {
    gap: "small",
    across: true
  }, jsx(Button, {
    isLoading: loading,
    size: "small",
    tone: "positive",
    weight: "bold",
    onClick: onCreateClick
  }, "Create ", list.singular), jsx(Button, {
    size: "small",
    weight: "none",
    onClick: onCancel
  }, "Cancel")));
}