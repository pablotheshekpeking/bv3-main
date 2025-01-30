import React, { useState } from 'react';
import { Box, Label, TextArea, Button, Icon } from '@adminjs/design-system';

const ImagesEdit = (props) => {
  const { record, property, onChange } = props;
  const [newUrls, setNewUrls] = useState('');
  const images = record.params.images || [];

  const handleDelete = async (imageId) => {
    try {
      await fetch(`/admin/api/resources/Image/records/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Refresh the page to show updated images
      window.location.reload();
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await fetch(`/admin/api/resources/Image/records/${imageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPrimary: true,
        }),
      });
      // Refresh the page to show updated images
      window.location.reload();
    } catch (error) {
      console.error('Error setting primary image:', error);
    }
  };

  return (
    <Box>
      <Label>Current Images</Label>
      <Box flex flexDirection="row" flexWrap="wrap">
        {images.map((image, index) => (
          <Box key={index} mr="default" mb="default" position="relative">
            <img 
              src={image.url} 
              alt={`Preview ${index}`} 
              style={{ 
                width: '150px', 
                height: '150px',
                objectFit: 'cover' 
              }} 
            />
            <Box mt="sm">
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleDelete(image.id)}
              >
                Delete
              </Button>
              {!image.isPrimary && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleSetPrimary(image.id)}
                  ml="default"
                >
                  Set as Primary
                </Button>
              )}
              {image.isPrimary && (
                <Label ml="default" style={{ color: 'green' }}>Primary</Label>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Box mt="xl">
        <Label>Add New Images (One URL per line)</Label>
        <TextArea
          value={newUrls}
          onChange={(e) => {
            setNewUrls(e.target.value);
            onChange('imageUrls', e.target.value);
          }}
          rows={5}
          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
        />
      </Box>
    </Box>
  );
};

export default ImagesEdit; 