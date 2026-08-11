const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

code = code.replace(
\`                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      },
    [units],\`,
\`                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      };
    },
    [units],\`
);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('fixed syntax');
