import React from 'react';
import { Box, Label } from '@adminjs/design-system';

const DocumentShow = (props) => {
  const { record } = props;
  const documentUrl = record.params.data;

  return (
    <Box>
      <Label>Document</Label>
      {documentUrl && (
        <Box>
          {documentUrl.endsWith('.pdf') ? (
            <embed 
              src={documentUrl} 
              type="application/pdf" 
              width="100%" 
              height="600px" 
            />
          ) : (
            <img 
              src={documentUrl} 
              alt="Document preview" 
              style={{ maxWidth: '100%' }} 
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default DocumentShow; 