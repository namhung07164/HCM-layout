with open('src/DataContext.tsx', 'r') as f:
    code = f.read()

anchor = "}, [units, classInfo, isLoading]);"

new_code = """  }, [units, classInfo, isLoading]);

  // Auto-sync projectLink when projectStatus changes
  useEffect(() => {
    if (isLoading) return;
    
    set(state => {
      let isChanged = false;
      const { projectLink, projectStatus } = state;
      if (!projectLink || projectLink.length === 0 || !projectStatus || projectStatus.length === 0) {
         return {};
      }

      const next = projectLink.map(link => {
        if (!link.unitLink) return link;
        const match = projectStatus.find(p => p.unit === link.unitLink);
        if (match) {
          if (
            link.status !== (match.status || '') ||
            link.actStatus !== (match.actStatus || '') ||
            link.task !== (match.task || '') ||
            link.startDate !== (match.startDate || '') ||
            link.endDate !== (match.endDate || '') ||
            link.party !== (match.party || '') ||
            link.flowStatus !== (match.flowStatus || '') ||
            (match.delegationStatus !== undefined && link.delegationStatus !== (match.delegationStatus || ''))
          ) {
            isChanged = true;
            const today = new Date();
            const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
            return {
              ...link,
              status: match.status || '',
              actStatus: match.actStatus || '',
              task: match.task || '',
              startDate: match.startDate || '',
              endDate: match.endDate || '',
              party: match.party || '',
              flowStatus: match.flowStatus || '',
              delegationStatus: match.delegationStatus || '',
              update: formattedDate
            };
          }
        }
        return link;
      });

      return isChanged ? { projectLink: next } : {};
    });
  }, [projectStatus, isLoading]);"""

if anchor in code:
    code = code.replace(anchor, new_code, 1)
    with open('src/DataContext.tsx', 'w') as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Anchor not found!")
