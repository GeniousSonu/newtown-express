'use client';

import React from 'react';
import {
  Control,
  UseFormRegister,
  FieldErrors,
  useFieldArray,
  useWatch,
} from 'react-hook-form';
import { MenuItemFormData } from '@/lib/validations/schemas';
import { Plus, Trash2, Layers, AlertCircle } from 'lucide-react';

interface AddonGroupFieldArrayProps {
  control: Control<MenuItemFormData>;
  register: UseFormRegister<MenuItemFormData>;
  errors: FieldErrors<MenuItemFormData>;
  disabled?: boolean;
}

interface SingleGroupProps {
  groupIndex: number;
  control: Control<MenuItemFormData>;
  register: UseFormRegister<MenuItemFormData>;
  errors: FieldErrors<MenuItemFormData>;
  onRemoveGroup: () => void;
  disabled?: boolean;
}

function SingleAddonGroupCard({
  groupIndex,
  control,
  register,
  errors,
  onRemoveGroup,
  disabled = false,
}: SingleGroupProps) {
  // ei group er options gulor jonno nested field array
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: `addonGroups.${groupIndex}.options` as const,
  });

  // button er moddhe group er naam dekhanor jonno watch koro
  const currentGroupName = useWatch({
    control,
    name: `addonGroups.${groupIndex}.groupName`,
    defaultValue: '',
  });

  const groupErrors = errors.addonGroups?.[groupIndex];

  return (
    <div className="p-4 sm:p-5 bg-[#FAFAF9] border-2 border-[#111111] rounded-2xl space-y-4 shadow-[0_3px_0_#111111] animate-in fade-in">
      {/* Group Header & Title Input */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-black uppercase text-[#111111] flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-[#111111] text-white flex items-center justify-center text-[10px]">
              {groupIndex + 1}
            </span>
            <span>Group Name</span>
            <span className="text-[#FF3B30]">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            placeholder="e.g. Bread Choice, Extra Cheese, Spice Level"
            {...register(`addonGroups.${groupIndex}.groupName`)}
            className={`w-full min-h-[42px] px-3.5 py-2 bg-white border-2 rounded-xl text-xs sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none ${
              groupErrors?.groupName ? 'border-red-500' : 'border-[#111111] focus:border-[#FF3B30]'
            }`}
          />
          {groupErrors?.groupName && (
            <p className="text-[11px] font-bold text-red-600">
              {groupErrors.groupName.message}
            </p>
          )}
        </div>

        {/* Remove Group Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={onRemoveGroup}
          className="mt-6 p-2 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-400 transition-colors shrink-0"
          title="Remove this entire addon group"
          aria-label={`Remove addon group ${groupIndex + 1}`}
        >
          <Trash2 className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Group Configuration Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {/* Required Toggle */}
        <label className="flex items-center justify-between p-3 bg-white border-2 border-[#111111]/20 rounded-xl cursor-pointer hover:border-[#111111] transition-all select-none">
          <div className="flex flex-col">
            <span className="text-xs font-black text-[#111111]">Required Group</span>
            <span className="text-[10px] font-bold text-stone-500">
              Customer must select an option
            </span>
          </div>
          <input
            type="checkbox"
            disabled={disabled}
            {...register(`addonGroups.${groupIndex}.required`)}
            className="w-5 h-5 rounded-md accent-[#FF3B30] cursor-pointer"
          />
        </label>

        {/* Multi-Select Toggle */}
        <label className="flex items-center justify-between p-3 bg-white border-2 border-[#111111]/20 rounded-xl cursor-pointer hover:border-[#111111] transition-all select-none">
          <div className="flex flex-col">
            <span className="text-xs font-black text-[#111111]">Multi-Select</span>
            <span className="text-[10px] font-bold text-stone-500">
              Customer can choose multiple options
            </span>
          </div>
          <input
            type="checkbox"
            disabled={disabled}
            {...register(`addonGroups.${groupIndex}.multiSelect`)}
            className="w-5 h-5 rounded-md accent-[#FF3B30] cursor-pointer"
          />
        </label>
      </div>

      {/* Options List */}
      <div className="space-y-2.5 pt-2 border-t-2 border-stone-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-[#111111]">
            Options in this group ({optionFields.length})
          </span>
        </div>

        {groupErrors?.options?.message && (
          <div className="p-2 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>{groupErrors.options.message}</span>
          </div>
        )}

        <div className="space-y-2">
          {optionFields.map((optField, optIndex) => {
            const optError = groupErrors?.options?.[optIndex];

            return (
              <div
                key={optField.id}
                className="p-2.5 bg-white border-2 border-[#111111]/30 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-all hover:border-[#111111]"
              >
                {/* Option Name Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Option name (e.g. Sunny Side Up)"
                    {...register(
                      `addonGroups.${groupIndex}.options.${optIndex}.name`
                    )}
                    className={`w-full min-h-[38px] px-3 py-1.5 bg-stone-50 border rounded-lg text-xs font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:bg-white ${
                      optError?.name ? 'border-red-500' : 'border-stone-300 focus:border-[#FF3B30]'
                    }`}
                  />
                  {optError?.name && (
                    <span className="text-[10px] font-bold text-red-600 block mt-0.5">
                      {optError.name.message}
                    </span>
                  )}
                </div>

                {/* Price Delta Input */}
                <div className="w-full sm:w-32">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-stone-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      disabled={disabled}
                      placeholder="Price + / -"
                      {...register(
                        `addonGroups.${groupIndex}.options.${optIndex}.priceDelta`,
                        { valueAsNumber: true }
                      )}
                      className={`w-full min-h-[38px] pl-6 pr-2 py-1.5 bg-stone-50 border rounded-lg text-xs font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:bg-white ${
                        optError?.priceDelta ? 'border-red-500' : 'border-stone-300 focus:border-[#FF3B30]'
                      }`}
                    />
                  </div>
                  {optError?.priceDelta && (
                    <span className="text-[10px] font-bold text-red-600 block mt-0.5">
                      {optError.priceDelta.message}
                    </span>
                  )}
                </div>

                {/* Delete Option Button */}
                <button
                  type="button"
                  disabled={disabled || optionFields.length <= 1}
                  onClick={() => removeOption(optIndex)}
                  className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 self-end sm:self-center disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Delete this option"
                  aria-label={`Delete option ${optIndex + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Option Button (Scoped clearly to this specific group) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            appendOption({
              name: '',
              priceDelta: 0,
              calorieDelta: null,
            })
          }
          className="w-full py-2.5 px-3 bg-white border-2 border-dashed border-[#111111]/40 hover:border-[#111111] hover:bg-stone-50 rounded-xl text-xs font-black text-[#111111] flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>
            Add Option to {currentGroupName?.trim() ? `"${currentGroupName.trim()}"` : 'This Group'}
          </span>
        </button>
      </div>
    </div>
  );
}

export function AddonGroupFieldArray({
  control,
  register,
  errors,
  disabled = false,
}: AddonGroupFieldArrayProps) {
  const {
    fields: groupFields,
    append: appendGroup,
    remove: removeGroup,
  } = useFieldArray({
    control,
    name: 'addonGroups',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#111111]">
            Addon Groups & Customizations
          </h3>
        </div>
        <span className="text-[11px] font-bold text-stone-500">
          {groupFields.length} group{groupFields.length === 1 ? '' : 's'} defined
        </span>
      </div>

      {groupFields.length === 0 ? (
        <div className="p-6 bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl text-center space-y-2">
          <p className="text-xs font-bold text-stone-500">
            No addon groups configured for this item yet.
          </p>
          <p className="text-[11px] text-stone-400">
            Add groups like &quot;Egg Style&quot;, &quot;Toppings&quot;, or &quot;Bread Type&quot; for customer customization.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupFields.map((groupField, groupIndex) => (
            <SingleAddonGroupCard
              key={groupField.id}
              groupIndex={groupIndex}
              control={control}
              register={register}
              errors={errors}
              onRemoveGroup={() => removeGroup(groupIndex)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Button to Add a New Addon Group */}
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          appendGroup({
            groupName: '',
            required: false,
            multiSelect: false,
            options: [
              { name: '', priceDelta: 0, calorieDelta: null },
            ],
          })
        }
        className="tactile-btn w-full py-3 px-4 bg-white border-2 border-[#111111] rounded-2xl text-xs sm:text-sm font-black text-[#111111] flex items-center justify-center gap-2 shadow-[0_3px_0_#111111] hover:bg-[#FFF8F2] transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4 stroke-[3] text-[#FF3B30]" />
        <span>Add Addon Group</span>
      </button>
    </div>
  );
}
