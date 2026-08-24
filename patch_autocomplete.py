with open('src/components/AutocompleteCell.tsx', 'r') as f:
    code = f.read()

# Fix onChange
old_onchange = """        onChange={(e) => {
          const newVal = e.target.value;
          setLocalVal(newVal);
          onChange(newVal);
          if (newVal.length >= minChars) {
            setShow(true);
          } else {
            setShow(false);
          }
        }}"""

new_onchange = """        onChange={(e) => {
          const newVal = e.target.value;
          setLocalVal(newVal);
          if (newVal.length >= minChars) {
            setShow(true);
          } else {
            setShow(false);
          }
        }}"""
code = code.replace(old_onchange, new_onchange)

# Fix onBlur
old_onblur = """        onBlur={() => {
          setTimeout(() => setShow(false), 200);
          if (!isSelectingRef.current && onBlur) {
            const success = onBlur(localVal);
            if (success === false) {
              setLocalVal(value || "");
              onChange(value || "");
            }
          }
        }}"""

new_onblur = """        onBlur={() => {
          setTimeout(() => setShow(false), 200);
          if (!isSelectingRef.current) {
            if (localVal !== value) {
                onChange(localVal);
            }
            if (onBlur) {
              const success = onBlur(localVal);
              if (success === false) {
                setLocalVal(value || "");
                onChange(value || "");
              }
            }
          }
        }}"""
code = code.replace(old_onblur, new_onblur)

# Fix onSelect (Enter key inside onKeyDown)
old_keydown = """        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (show && filtered.length > 0) {
              isSelectingRef.current = true;
              const success = onSelect(filtered[0].item);
              if (success === false) {
                setLocalVal(value || "");
                onChange(value || "");
              }
            } else if (!show) {
              isSelectingRef.current = true;
              const success = onSelect(localVal);
              if (success === false) {
                setLocalVal(value || "");
                onChange(value || "");
              }
            }
            setShow(false);
            setTimeout(() => { isSelectingRef.current = false; }, 200);
          }
        }}"""

new_keydown = """        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (localVal !== value) onChange(localVal);
            if (show && filtered.length > 0) {
              isSelectingRef.current = true;
              const success = onSelect(filtered[0].item);
              if (success === false) {
                setLocalVal(value || "");
                onChange(value || "");
              }
            } else if (!show) {
              isSelectingRef.current = true;
              const success = onSelect(localVal);
              if (success === false) {
                setLocalVal(value || "");
                onChange(value || "");
              }
            }
            setShow(false);
            setTimeout(() => { isSelectingRef.current = false; }, 200);
          }
        }}"""
code = code.replace(old_keydown, new_keydown)

with open('src/components/AutocompleteCell.tsx', 'w') as f:
    f.write(code)
print("patched autocomplete")
