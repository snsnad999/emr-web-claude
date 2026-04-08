import { useState } from 'react';
import {
  Box, Typography, IconButton, Collapse, Chip, Tooltip,
  Button, Popover, List, ListItem, ListItemText, ListItemSecondaryAction,
  TextField, Divider, Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import type { SectionId } from '../context/PrescriptionContext';
import { usePrescription } from '../context/PrescriptionContext';

interface SectionHeaderProps {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
  itemCount?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  templateType?: string;
  onSaveTemplate?: (name: string) => void;
  onUpdateTemplate?: (templateId: string, name: string) => void;
  templates?: Array<{ templateId: string; name: string }>;
  onApplyTemplate?: (templateId: string) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

export default function SectionHeader({
  id, title, icon, itemCount, children, defaultExpanded = true,
  templateType, onSaveTemplate, onUpdateTemplate, templates, onApplyTemplate, onDeleteTemplate,
}: SectionHeaderProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { sectionConfig, toggleSection } = usePrescription();
  const isEnabled = sectionConfig.enabledSections.includes(id);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const popoverOpen = Boolean(anchorEl);

  const handleSaveTemplate = () => {
    const trimmed = newTemplateName.trim();
    if (!trimmed || !onSaveTemplate) return;
    onSaveTemplate(trimmed);
    setNewTemplateName('');
    setAnchorEl(null);
  };

  const handleStartEdit = (templateId: string, currentName: string) => {
    setEditingTemplateId(templateId);
    setEditTemplateName(currentName);
  };

  const handleUpdateTemplate = () => {
    const trimmed = editTemplateName.trim();
    if (!trimmed || !editingTemplateId || !onUpdateTemplate) return;
    onUpdateTemplate(editingTemplateId, trimmed);
    setEditingTemplateId(null);
    setEditTemplateName('');
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditTemplateName('');
  };

  if (!isEnabled) return null;

  const hasTemplateSupport = Boolean(templateType && onSaveTemplate && onApplyTemplate);

  return (
    <Box
      id={`section-${id}`}
      sx={{
        mb: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        scrollMarginTop: 8,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          bgcolor: expanded ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          '&:hover': { bgcolor: 'primary.50' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
          <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
          {typeof itemCount === 'number' && itemCount > 0 && (
            <Chip label={itemCount} size="small" color="primary" sx={{ height: 22, fontSize: 12 }} />
          )}
        </Box>

        {hasTemplateSupport && (
          <Tooltip title="Templates">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setAnchorEl(e.currentTarget);
              }}
              sx={{ mr: 0.5, color: 'text.secondary' }}
            >
              <BookmarkBorderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Hide section">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); toggleSection(id); }}
            sx={{ mr: 0.5 }}
          >
            <VisibilityOffIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {hasTemplateSupport && (
        <Popover
          open={popoverOpen}
          anchorEl={anchorEl}
          onClose={() => { setAnchorEl(null); setNewTemplateName(''); handleCancelEdit(); }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { width: 320, maxHeight: 440 } } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {title} Templates
            </Typography>
          </Box>
          <Divider />

          {templates && templates.length > 0 ? (
            <List dense sx={{ maxHeight: 240, overflow: 'auto', py: 0.5 }}>
              {templates.map((t) => (
                <ListItem key={t.templateId} sx={{ pr: 12 }}>
                  {editingTemplateId === t.templateId ? (
                    <Stack direction="row" spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={editTemplateName}
                        onChange={(e) => setEditTemplateName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateTemplate();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        sx={{ flex: 1 }}
                        slotProps={{ htmlInput: { maxLength: 50 } }}
                        autoFocus
                      />
                      <Button size="small" variant="contained" onClick={handleUpdateTemplate} sx={{ minWidth: 50, textTransform: 'none', fontSize: 11 }}>
                        Save
                      </Button>
                      <Button size="small" onClick={handleCancelEdit} sx={{ minWidth: 40, textTransform: 'none', fontSize: 11 }}>
                        Cancel
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <ListItemText
                        primary={t.name}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Apply">
                          <IconButton
                            edge="end"
                            size="small"
                            color="primary"
                            onClick={() => {
                              onApplyTemplate?.(t.templateId);
                              setAnchorEl(null);
                            }}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {onUpdateTemplate && (
                          <Tooltip title="Update with current items">
                            <IconButton
                              edge="end"
                              size="small"
                              color="info"
                              onClick={() => handleStartEdit(t.templateId, t.name)}
                              sx={{ ml: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            edge="end"
                            size="small"
                            color="error"
                            onClick={() => onDeleteTemplate?.(t.templateId)}
                            sx={{ ml: 0.5 }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                No saved templates
              </Typography>
            </Box>
          )}

          <Divider />
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Save current items as template
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Template name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); }}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { maxLength: 50 } }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSaveTemplate}
                disabled={!newTemplateName.trim()}
                sx={{ minWidth: 'auto', px: 1.5, textTransform: 'none' }}
              >
                Save
              </Button>
            </Stack>
          </Box>
        </Popover>
      )}

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
