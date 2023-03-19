/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Button, Checkbox, List, Space, Tooltip } from 'antd';
import Loader from 'components/Loader/Loader';
import { ADD_USER_CONTAINER_HEIGHT, pagingObject } from 'constants/constants';
import { EntityReference } from 'generated/entity/data/table';
import { Paging } from 'generated/type/paging';
import { cloneDeep, isEmpty, sortBy } from 'lodash';
import VirtualList from 'rc-virtual-list';
import React, { UIEventHandler, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SVGIcons, { Icons } from 'utils/SvgUtils';
import Searchbar from '../searchbar/Searchbar';
import '../UserSelectableList/user-select-dropdown.less';
import { UserTag } from '../UserTag/UserTag.component';
import { SelectableListProps } from './SelectableList.interface';

export const SelectableList = ({
  fetchOptions,
  multiSelect,
  selectedItems,
  onUpdate,
  onCancel,
  searchPlaceholder,
  customTagRenderer,
}: SelectableListProps) => {
  const [uniqueOptions, setUniqueOptions] = useState<EntityReference[]>([]);
  const [searchText, setSearchText] = useState('');
  const { t } = useTranslation();
  const [pagingInfo, setPagingInfo] = useState<Paging>(pagingObject);

  const [selectedItemsInternal, setSelectedItemInternal] = useState<
    Map<string, EntityReference>
  >(() => {
    const selectedItemMap = new Map();

    selectedItems.map((item) => selectedItemMap.set(item.id, item));

    return selectedItemMap;
  });

  const [fetching, setFetching] = useState(false);
  const [fetchOptionFailed, setFetchOptionFailed] = useState(false);

  useEffect(() => {
    setSelectedItemInternal(() => {
      const selectedItemMap = new Map();

      selectedItems.map((item) => selectedItemMap.set(item.id, item));

      return selectedItemMap;
    });
  }, [setSelectedItemInternal, selectedItems]);

  const sortUniqueListFromSelectedList = (
    items: string[],
    listOptions: EntityReference[]
  ) => {
    if (isEmpty(items)) {
      return listOptions;
    }

    return sortBy(listOptions, (a) => {
      return items.indexOf(a.id) > -1 ? -1 : 0;
    });
  };

  const fetchListOptions = useCallback(async () => {
    setFetching(true);
    try {
      const { data, paging } = await fetchOptions('');

      setUniqueOptions(
        sortUniqueListFromSelectedList([...selectedItemsInternal.keys()], data)
      );
      setPagingInfo(paging);
      fetchOptionFailed && setFetchOptionFailed(false);
    } catch (error) {
      setFetchOptionFailed(true);
    } finally {
      setFetching(false);
    }
  }, [selectedItemsInternal]);

  useEffect(() => {
    fetchListOptions();
  }, []);

  const handleSearch = async (search: string) => {
    const { data, paging } = await fetchOptions(search);

    setUniqueOptions(data);
    setPagingInfo(paging);
    setSearchText(search);
  };

  const onScroll: UIEventHandler<HTMLElement> = async (e) => {
    if (
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop ===
        ADD_USER_CONTAINER_HEIGHT &&
      pagingInfo.after
    ) {
      const { data, paging } = await fetchOptions(searchText, pagingInfo.after);

      setUniqueOptions((prevData) => [...prevData, ...data]);
      setPagingInfo(paging);
    }
  };

  const selectionHandler = (item: EntityReference) => {
    multiSelect
      ? setSelectedItemInternal((itemsMap) => {
          const id = item.id;
          const newItemsMap = cloneDeep(itemsMap);
          if (newItemsMap.has(id)) {
            newItemsMap?.delete(id);
          } else {
            newItemsMap?.set(id, item);
          }

          setUniqueOptions((options) =>
            sortUniqueListFromSelectedList([...newItemsMap.keys()], options)
          );

          return newItemsMap;
        })
      : onUpdate(selectedItemsInternal.has(item.id) ? [] : [item]);
  };

  const handleUpdateClick = () => {
    onUpdate([...selectedItemsInternal.values()]);
  };

  return (
    <>
      <Searchbar
        removeMargin
        placeholder={searchPlaceholder ?? t('label.search')}
        searchValue={searchText}
        typingInterval={500}
        onSearch={handleSearch}
      />
      <List
        footer={
          <Space className=" m-r-md" direction="vertical">
            <p className="text-xs font-medium">
              {t('label.count-of-total-entity', {
                count: uniqueOptions.length,
                total: pagingInfo.total,
                entity: t('label.user-plural'),
              })}
            </p>
            {multiSelect && (
              <div className="text-right">
                <Button
                  className="m-l-auto"
                  color="primary"
                  size="small"
                  type="text"
                  onClick={onCancel}>
                  {t('label.cancel')}
                </Button>
                <Button
                  className="update-btn m-l-auto"
                  size="small"
                  type="default"
                  onClick={handleUpdateClick}>
                  {t('label.update')}
                </Button>
              </div>
            )}
          </Space>
        }
        itemLayout="vertical"
        loading={{ spinning: fetching, indicator: <Loader /> }}
        size="small">
        <VirtualList
          className="w-40"
          data={uniqueOptions}
          height={ADD_USER_CONTAINER_HEIGHT}
          itemKey="id"
          onScroll={onScroll}>
          {(item) => (
            <List.Item
              className="cursor-pointer"
              extra={
                multiSelect ? (
                  <Checkbox checked={selectedItemsInternal.has(item.id)} />
                ) : (
                  selectedItemsInternal.has(item.id) && <RemoveIcon />
                )
              }
              key={item.id}
              onClick={() => selectionHandler(item)}>
              {customTagRenderer ? (
                customTagRenderer(item)
              ) : (
                <UserTag
                  id={item.fullyQualifiedName ?? ''}
                  name={item.displayName ?? ''}
                />
              )}
            </List.Item>
          )}
        </VirtualList>
      </List>
    </>
  );
};

const RemoveIcon = ({ removeOwner }: { removeOwner?: () => void }) => {
  const { t } = useTranslation();

  return (
    <Tooltip
      title={t('label.remove-entity', {
        entity: t('label.owner-lowercase'),
      })}>
      <button
        className="cursor-pointer"
        data-testid="remove-owner"
        onClick={(e) => {
          e.stopPropagation();
          removeOwner && removeOwner();
        }}>
        <SVGIcons
          alt={t('label.remove-entity', {
            entity: t('label.owner-lowercase'),
          })}
          icon={Icons.ICON_REMOVE}
          title={t('label.remove-entity', {
            entity: t('label.owner-lowercase'),
          })}
          width="16px"
        />
      </button>
    </Tooltip>
  );
};
